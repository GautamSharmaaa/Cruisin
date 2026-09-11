// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

export const logisticsNotificationEventTypes = [
  'shipment_created',
  'awb_assigned',
  'pickup_scheduled',
  'picked_up',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'ndr',
  'reattempt_requested',
  'rto_initiated',
  'rto_delivered',
  'return_submitted',
  'return_approved',
  'return_rejected',
  'return_pickup_scheduled',
  'return_received',
  'return_refund_destination_required',
  'return_refund_initiated',
  'return_refunded',
  'exchange_approved',
  'replacement_shipped',
  'exchange_completed'
] as const;

export type LogisticsNotificationEventType = (typeof logisticsNotificationEventTypes)[number];
export const logisticsNotificationChannels = ['in_app', 'email', 'sms', 'whatsapp'] as const;

const deliverySchema = new Schema({
  channel: { type: String, enum: logisticsNotificationChannels, required: true },
  template: { type: String, required: true, trim: true },
  recipient: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], required: true, default: 'pending' },
  attempts: { type: Number, min: 0, default: 0 },
  sentAt: { type: Date },
  lastAttemptAt: { type: Date },
  lastError: { type: String, trim: true, maxlength: 500 }
}, { _id: false });

const logisticsNotificationEventSchema = new Schema({
  dedupeKey: { type: String, required: true, trim: true, unique: true, index: true },
  eventType: { type: String, enum: logisticsNotificationEventTypes, required: true, index: true },
  source: { type: String, enum: ['service', 'job', 'webhook'], required: true, default: 'service', index: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment', index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityReference: { type: String, trim: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'sent', 'partial', 'failed', 'skipped'], default: 'pending', required: true, index: true },
  deliveries: { type: [deliverySchema], required: true, default: [] },
  occurredAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

logisticsNotificationEventSchema.index({ status: 1, createdAt: -1 });
logisticsNotificationEventSchema.index({ 'deliveries.status': 1, createdAt: -1 });
logisticsNotificationEventSchema.index({ customer: 1, eventType: 1, createdAt: -1 });

export type LogisticsNotificationEventDocument = InferSchemaType<typeof logisticsNotificationEventSchema>;
export const LogisticsNotificationEventModel = model('LogisticsNotificationEvent', logisticsNotificationEventSchema);
