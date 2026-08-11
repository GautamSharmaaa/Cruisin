// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { LogisticsService } from '../services/logistics/logistics.service.js';
import { logger } from '../utils/logger.js';

const activeStatuses = [
  'provider_order_created',
  'awb_assigned',
  'pickup_scheduled',
  'out_for_pickup',
  'picked_up',
  'shipped',
  'in_transit',
  'reached_destination_hub',
  'out_for_delivery',
  'delivery_exception',
  'ndr',
  'rto_initiated',
  'rto_in_transit'
] as const;

const boundedInteger = (value: string | undefined, fallback: number, maximum: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const run = async (): Promise<void> => {
  if (process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS === 'true' || process.env.SHIPROCKET_MODE === 'live') {
    throw new Error('Reconciliation refuses to start while Shiprocket mutations are enabled');
  }
  const batchSize = boundedInteger(process.env.SHIPROCKET_RECONCILE_BATCH_SIZE, 25, 100);
  const concurrency = boundedInteger(process.env.SHIPROCKET_RECONCILE_CONCURRENCY, 3, 5);
  await connectDb();
  const shipments = await ShipmentModel.find({
    provider: 'shiprocket',
    shipmentStatus: { $in: activeStatuses },
    $or: [{ providerOrderId: { $type: 'string' } }, { providerShipmentId: { $type: 'string' } }]
  }).sort({ lastSuccessfulSyncAt: 1, updatedAt: 1 }).limit(batchSize).select('_id').lean();
  const summary = { scanned: shipments.length, changed: 0, unchanged: 0, failed: 0 };
  for (let offset = 0; offset < shipments.length; offset += concurrency) {
    const slice = shipments.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(slice.map((shipment) => LogisticsService.reconcileShiprocketShipment(String(shipment._id), 'scheduled_reconciliation')));
    for (const result of results) {
      if (result.status === 'rejected') summary.failed += 1;
      else if ((result.value as { changed?: boolean }).changed) summary.changed += 1;
      else summary.unchanged += 1;
    }
  }
  logger.info('Shiprocket reconciliation completed', {
    scanned: summary.scanned,
    changed: summary.changed,
    unchanged: summary.unchanged,
    failed: summary.failed,
    shiprocketMutations: 0
  });
  console.log(`Scanned: ${summary.scanned}`);
  console.log(`Changed: ${summary.changed}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log(`Failed: ${summary.failed}`);
  console.log('Shiprocket mutations: 0');
  if (summary.failed > 0) process.exitCode = 1;
};

void run()
  .catch((error: unknown) => {
    logger.error('Shiprocket reconciliation failed', { error: error instanceof Error ? error.message : 'unknown error' });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => undefined);
  });
