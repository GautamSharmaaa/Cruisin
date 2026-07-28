// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const logisticsWebhookEventSchema = new Schema({
  provider: { type: String, enum: ['shiprocket'], required: true, index: true },
  fingerprint: { type: String, required: true },
  eventType: { type: String, required: true, trim: true },
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment', index: true },
  status: { type: String, enum: ['received', 'processed', 'failed', 'ignored'], default: 'received', required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  processedAt: { type: Date },
  error: { type: String, trim: true }
}, { timestamps: true });

logisticsWebhookEventSchema.index({ provider: 1, fingerprint: 1 }, { unique: true });

export type LogisticsWebhookEventDocument = InferSchemaType<typeof logisticsWebhookEventSchema>;
export const LogisticsWebhookEventModel = model('LogisticsWebhookEvent', logisticsWebhookEventSchema);
