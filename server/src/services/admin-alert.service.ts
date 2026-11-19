import { createHash } from 'node:crypto';
import type { Types } from 'mongoose';
import twilio from 'twilio';
import { env } from '../config/env.js';
import { AdminAlertDeliveryModel, AdminAlertPreferencesModel } from '../models/admin-alert.model.js';
import { OrderModel } from '../models/order.model.js';
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { OperationsNotificationModel } from '../models/operations-event.model.js';
import { logger } from '../utils/logger.js';

const settingsId = 'whatsapp';
const hasProvider = (): boolean => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN &&
  env.TWILIO_WHATSAPP_FROM && /^HX[a-f0-9]{32}$/i.test(env.TWILIO_ADMIN_ALERT_CONTENT_SID ?? ''));

export async function getAdminAlertSettings() {
  const preferences = await AdminAlertPreferencesModel.findById(settingsId).lean();
  const delivery = env.APP_ENV !== 'production' ? 'local' : hasProvider() ? 'configured' : 'setup_required';
  return { recipients: preferences?.recipients ?? [], delivery };
}

export async function saveAdminAlertSettings(recipients: string[]) {
  const values = [...new Set(recipients)];
  const wasDisabled = { $eq: [{ $size: { $ifNull: ['$recipients', []] } }, 0] };
  const resetCursor = { $and: [values.length > 0, wasDisabled] };
  await AdminAlertPreferencesModel.updateOne({ _id: settingsId }, [{
    $set: {
      recipients: values,
      enabledSince: { $cond: [resetCursor, '$$NOW', '$enabledSince'] },
      cursors: { $cond: [resetCursor, {}, '$cursors'] },
    },
  }], { upsert: true });
  return getAdminAlertSettings();
}

type EventRow = {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  orderNumber?: string | null;
  dedupeKey?: string;
};
type Cursor = { at: Date; id: Types.ObjectId };
const category: Record<string, string> = {
  orders: 'New order', returns: 'Return request', exchanges: 'Exchange request', employee: 'Employee website activity',
};

async function collectEvents(): Promise<void> {
  const preferences = await AdminAlertPreferencesModel.findById(settingsId);
  if (!preferences?.enabledSince || !preferences.recipients.length) return;
  const { enabledSince, recipients } = preferences;
  const sources = ['orders', 'returns', 'exchanges', 'employee'] as const;
  for (const source of sources) {
    const cursor = preferences.cursors?.get(source) as Cursor | undefined;
    const date = source === 'employee' ? 'createdAt' : 'updatedAt';
    const query = {
      $and: [
        { createdAt: { $gte: enabledSince } },
        cursor ? { $or: [{ [date]: { $gt: cursor.at } }, { [date]: cursor.at, _id: { $gt: cursor.id } }] } : {},
      ],
    };
    const sort = { [date]: 1 as const, _id: 1 as const };
    const rows: EventRow[] = await (async () => {
      switch (source) {
        case 'orders': return OrderModel.find({
          ...query, isTestOrder: { $ne: true }, isAnalyticsTestData: { $ne: true },
          paymentStatus: { $in: ['paid', 'partially_paid', 'cod_pending', 'cod_collected', 'refunded', 'partially_refunded'] },
        }).select('createdAt updatedAt orderNumber').sort(sort).limit(50).lean();
        case 'returns': return ReturnRequestModel.find({ ...query, status: { $ne: 'payment_pending' } }).select('createdAt updatedAt').sort(sort).limit(50).lean();
        case 'exchanges': return ExchangeRequestModel.find({ ...query, status: { $ne: 'payment_pending' } }).select('createdAt updatedAt').sort(sort).limit(50).lean();
        case 'employee': return OperationsNotificationModel.find(query).select('createdAt updatedAt dedupeKey').sort(sort).limit(50).lean();
      }
    })();
    for (const row of rows) {
      const operationsKey = row.dedupeKey?.split(':').slice(0, -1).join(':');
      const eventKey = operationsKey || String(row._id);
      const reference = row.orderNumber || (operationsKey
        ? createHash('sha256').update(operationsKey).digest('hex').slice(0, 12).toUpperCase()
        : String(row._id).toUpperCase());
      await AdminAlertDeliveryModel.bulkWrite(recipients.map(recipient => ({
        updateOne: {
          filter: { _id: createHash('sha256').update(JSON.stringify([source, eventKey, recipient])).digest('hex') },
          update: { $setOnInsert: { recipient, category: category[source], reference, status: 'queued', nextAttempt: new Date(), attempts: 0, createdAt: new Date(), updatedAt: new Date() } },
          upsert: true, timestamps: false,
        },
      })));
    }
    const last = rows.at(-1);
    if (last) {
      const field = 'cursors.' + source;
      await AdminAlertPreferencesModel.updateOne({
        _id: settingsId, enabledSince,
        ...(cursor ? { [field + '.at']: cursor.at, [field + '.id']: cursor.id } : { [field]: { $exists: false } }),
      }, { $set: { [field]: { at: last[date], id: last._id } } });
    }
  }
}

export async function processAdminAlerts(): Promise<void> {
  if (env.APP_ENV !== 'production' || !hasProvider()) return;
  await collectEvents();
  // An interrupted submission has an unknown outcome. Retrying it could send a duplicate.
  await AdminAlertDeliveryModel.updateMany(
    { status: 'sending', updatedAt: { $lt: new Date(Date.now() - 5 * 60_000) } },
    { $set: { status: 'failed' } },
  );
  const provider = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, { timeout: 10_000 });
  for (let count = 0; count < 10; count += 1) {
    const delivery = await AdminAlertDeliveryModel.findOneAndUpdate(
      { status: 'queued', nextAttempt: { $lte: new Date() } },
      { $set: { status: 'sending' }, $inc: { attempts: 1 } },
      { new: true, sort: { nextAttempt: 1 } },
    );
    if (!delivery) return;
    const active = await AdminAlertPreferencesModel.exists({ _id: settingsId, recipients: delivery.recipient });
    if (!active) {
      await delivery.updateOne({ status: 'skipped' });
      continue;
    }
    let providerSid: string;
    try {
      const message = await provider.messages.create({
        from: 'whatsapp:' + env.TWILIO_WHATSAPP_FROM?.replace(/^whatsapp:/, ''),
        to: 'whatsapp:' + delivery.recipient,
        contentSid: env.TWILIO_ADMIN_ALERT_CONTENT_SID,
        contentVariables: JSON.stringify({ 1: delivery.category, 2: delivery.reference }),
      });
      providerSid = message.sid;
    } catch (error) {
      const status = (error as { status?: number }).status;
      const retry = status === 429 && delivery.attempts < 4;
      await delivery.updateOne({ status: retry ? 'queued' : 'failed', nextAttempt: new Date(Date.now() + 60_000 * delivery.attempts) });
      logger.warn('Admin WhatsApp alert submission failed', { deliveryId: delivery.id, status });
      continue;
    }
    await delivery.updateOne({ status: 'submitted', providerSid });
  }
}
