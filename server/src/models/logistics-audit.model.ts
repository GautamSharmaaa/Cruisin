// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const logisticsAuditSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
  shipment: { type: Schema.Types.ObjectId, ref: 'Shipment', index: true },
  admin: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorType: { type: String, enum: ['admin', 'customer', 'system', 'provider'], required: true },
  action: { type: String, required: true, trim: true, index: true },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  providerReference: { type: String, trim: true },
  failureReason: { type: String, trim: true },
  correlationId: { type: String, trim: true }
}, { timestamps: true });

logisticsAuditSchema.index({ createdAt: -1 });
logisticsAuditSchema.index({ shipment: 1, createdAt: -1 });

export type LogisticsAuditDocument = InferSchemaType<typeof logisticsAuditSchema>;
export const LogisticsAuditModel = model('LogisticsAudit', logisticsAuditSchema);
