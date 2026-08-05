// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const quoteOptionSchema = new Schema({
  code: { type: String, enum: ['standard', 'express'], required: true },
  label: { type: String, required: true },
  shippingCharge: { type: Number, required: true, min: 0 },
  providerCost: { type: Number, required: true, min: 0 },
  codCharge: { type: Number, required: true, min: 0, default: 0 },
  courierId: { type: Number, required: true },
  courierName: { type: String, required: true },
  shippingMode: { type: String, enum: ['surface', 'air', 'unknown'], required: true },
  estimatedDeliveryDays: { type: Number, min: 0 },
  estimatedDeliveryDate: { type: String },
  codAvailable: { type: Boolean, required: true }
}, { _id: false });

const logisticsQuoteSchema = new Schema({
  quoteId: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cartFingerprint: { type: String, required: true, index: true },
  deliveryPostcode: { type: String, required: true },
  pickupPostcode: { type: String, required: true },
  paymentMode: { type: String, enum: ['prepaid', 'cod'], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  declaredValue: { type: Number, required: true, min: 0 },
  package: { type: Schema.Types.Mixed, required: true },
  options: { type: [quoteOptionSchema], required: true },
  selectedOptionCode: { type: String, enum: ['standard', 'express'] },
  provider: { type: String, enum: ['shiprocket'], default: 'shiprocket', required: true },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date }
}, { timestamps: true });

logisticsQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
logisticsQuoteSchema.index({ user: 1, createdAt: -1 });

export type LogisticsQuoteDocument = InferSchemaType<typeof logisticsQuoteSchema>;
export const LogisticsQuoteModel = model('LogisticsQuote', logisticsQuoteSchema);
