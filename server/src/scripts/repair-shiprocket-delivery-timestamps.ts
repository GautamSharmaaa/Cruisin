// Governed by .rules v1.0
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient, ObjectId, BSON } from 'mongodb';
import { z } from 'zod';
import { ShiprocketProvider } from '../services/logistics/shiprocket-provider.js';
import { planShiprocketTimestampRepair, type ShiprocketTimestampState } from '../services/logistics/shiprocket-timestamp-repair.js';

const timestampStateSchema = z.object({
  deliveredDate: z.date().optional(),
  lastTrackingUpdate: z.date().optional(),
  trackingScans: z.array(z.object({
    timestamp: z.date(), fingerprint: z.string(), status: z.string(), rawStatus: z.string(),
    message: z.string(), location: z.string().optional(), providerStatusId: z.number().optional()
  }).passthrough())
});
const planSchema = z.object({
  version: z.literal('shiprocket-india-time-v1'), database: z.string(), createdAt: z.date(),
  records: z.array(z.object({
    id: z.instanceof(ObjectId), order: z.instanceof(ObjectId), orderNumber: z.string(),
    updatedAt: z.date(), before: timestampStateSchema,
    after: timestampStateSchema.extend({ deliveredDate: z.date(), scansCorrected: z.number().int().nonnegative() })
  }))
});

const run = async (): Promise<void> => {
  const [mode, filename, ...extra] = process.argv.slice(2);
  if (!['--plan', '--apply'].includes(mode ?? '') || !filename || extra.length || !path.isAbsolute(filename)) {
    throw new Error('Usage: repair-shiprocket-delivery-timestamps.ts --plan|--apply /absolute/path/plan.json');
  }
  if (process.env.SHIPROCKET_MODE !== 'live-readonly' || process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS !== 'false') {
    throw new Error('Timestamp repair requires live-readonly mode with provider mutations disabled');
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Database configuration is required');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12_000 });
  try {
    await client.connect();
    const db = client.db();
    const shipments = db.collection('shipments');
    if (mode === '--apply') {
      const plan = planSchema.parse(BSON.EJSON.parse(await readFile(filename, 'utf8')));
      if (plan.database !== db.databaseName || Date.now() - plan.createdAt.getTime() > 60 * 60_000) {
        throw new Error('Plan database does not match or the one-hour plan validity has expired');
      }
      // The plan is a private, lossless before/after backup. Preserve a second
      // copy before any writes; updates are restricted to delivery/scan dates.
      await writeFile(`${filename}.before-apply.json`, BSON.EJSON.stringify(plan, { relaxed: false }), { flag: 'wx', mode: 0o600 });
      let applied = 0;
      let concurrentChanges = 0;
      for (const record of plan.records) {
        const order = await db.collection('orders').findOne({ _id: record.order, archivedAt: { $exists: false }, orderStatus: { $ne: 'cancelled' } }, { projection: { _id: 1 } });
        if (!order) { concurrentChanges += 1; continue; }
        const result = await shipments.updateOne({
          _id: record.id, order: record.order, provider: 'shiprocket', shipmentType: 'forward', shipmentStatus: 'delivered',
          updatedAt: record.updatedAt,
          $and: [
            { trackingScans: { $size: record.before.trackingScans.length } },
            ...record.before.trackingScans.map((scan) => ({ trackingScans: { $elemMatch: { fingerprint: scan.fingerprint, timestamp: scan.timestamp } } }))
          ],
          deliveredDate: record.before.deliveredDate ?? { $exists: false }
        }, { $set: {
          deliveredDate: record.after.deliveredDate,
          trackingScans: record.after.trackingScans,
          ...(record.after.lastTrackingUpdate ? { lastTrackingUpdate: record.after.lastTrackingUpdate } : {}),
          updatedAt: new Date()
        } });
        if (result.modifiedCount === 1) applied += 1;
        else concurrentChanges += 1;
      }
      console.log(JSON.stringify({ applied, concurrentChanges, providerMutations: 0, backup: `${filename}.before-apply.json` }));
      if (concurrentChanges) process.exitCode = 1;
      return;
    }
    const candidates = await shipments.aggregate([
      { $match: { provider: 'shiprocket', shipmentType: 'forward', shipmentStatus: 'delivered', awb: { $type: 'string' } } },
      { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'commerceOrder' } },
      { $match: { 'commerceOrder.0': { $exists: true }, 'commerceOrder.archivedAt': { $exists: false }, 'commerceOrder.orderStatus': { $ne: 'cancelled' } } },
      { $project: { _id: 1, order: 1, sourceOrderId: 1, awb: 1, providerShipmentId: 1, updatedAt: 1, deliveredDate: 1, lastTrackingUpdate: 1, trackingScans: 1 } },
      { $sort: { _id: 1 } }, { $limit: 500 }
    ]).toArray();
    if (candidates.length === 500) throw new Error('Candidate limit reached; refusing a potentially incomplete repair');
    const provider = new ShiprocketProvider();
    const records: z.infer<typeof planSchema>['records'] = [];
    let failed = 0;
    let checked = 0;
    let index = 0;
    const worker = async (): Promise<void> => {
      while (index < candidates.length) {
        const candidate = candidates[index++];
        try {
          const tracking = await provider.trackShipment({ awb: String(candidate.awb), providerShipmentId: String(candidate.providerShipmentId) });
          if (tracking.awb !== candidate.awb) throw new Error('Provider identifier mismatch');
          const before: ShiprocketTimestampState = {
            deliveredDate: candidate.deliveredDate as Date | undefined,
            lastTrackingUpdate: candidate.lastTrackingUpdate as Date | undefined,
            trackingScans: candidate.trackingScans as ShiprocketTimestampState['trackingScans']
          };
          const after = planShiprocketTimestampRepair(before, tracking);
          if (after) records.push(planSchema.shape.records.element.parse({ id: candidate._id, order: candidate.order as ObjectId, orderNumber: String(candidate.sourceOrderId), updatedAt: candidate.updatedAt as Date, before, after }));
        } catch { failed += 1; }
        checked += 1;
        if (checked % 20 === 0) console.log(JSON.stringify({ checked, total: candidates.length, repairs: records.length, failed, productionWrites: 0 }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const plan = planSchema.parse({ version: 'shiprocket-india-time-v1', database: db.databaseName, createdAt: new Date(), records });
    await writeFile(filename, BSON.EJSON.stringify(plan, { relaxed: false }), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ checked, repairs: records.length, scansCorrected: records.reduce((sum, record) => sum + record.after.scansCorrected, 0), failed, productionWrites: 0, providerMutations: 0, plan: filename,
      records: records.map((record) => ({ orderNumber: record.orderNumber, before: record.before.deliveredDate, after: record.after.deliveredDate, scansCorrected: record.after.scansCorrected })) }, null, 2));
    if (failed) process.exitCode = 1;
  } finally { await client.close(); }
};

void run().catch((error: unknown) => {
  console.error(error instanceof z.ZodError ? 'Timestamp repair plan validation failed' : error instanceof Error ? error.message : 'Timestamp repair failed');
  process.exitCode = 1;
});
