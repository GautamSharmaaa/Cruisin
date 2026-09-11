// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

export const logisticsJobTypes = ['create_order', 'assign_awb', 'schedule_pickup', 'generate_label', 'generate_invoice', 'generate_manifest', 'refresh_tracking', 'cancel_shipment', 'create_return', 'create_exchange', 'reconcile_tracking', 'order_created', 'release_payment_reservation'] as const;

const logisticsJobSchema = new Schema({
  type: { type: String, enum: logisticsJobTypes, required: true, index: true },
  dedupeKey: { type: String, required: true, unique: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed', 'dead'], default: 'queued', required: true, index: true },
  attempts: { type: Number, min: 0, default: 0 },
  maxAttempts: { type: Number, min: 1, default: 5 },
  runAt: { type: Date, default: Date.now, index: true },
  leaseId: { type: String, trim: true },
  leaseExpiresAt: { type: Date },
  lastError: {
    code: { type: String, trim: true },
    message: { type: String, trim: true },
    retryable: { type: Boolean },
    occurredAt: { type: Date }
  },
  completedAt: { type: Date }
}, { timestamps: true });

logisticsJobSchema.index({ status: 1, runAt: 1, leaseExpiresAt: 1 });

export type LogisticsJobDocument = InferSchemaType<typeof logisticsJobSchema>;
export const LogisticsJobModel = model('LogisticsJob', logisticsJobSchema);
