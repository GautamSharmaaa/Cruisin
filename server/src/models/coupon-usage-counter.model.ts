// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const couponUsageCounterSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  usedCount: { type: Number, min: 0, default: 0, required: true },
  nextSequence: { type: Number, min: 0, default: 0, required: true },
  limitSnapshot: { type: Number, min: 1, required: true }
}, { timestamps: true });

couponUsageCounterSchema.index({ customer: 1, coupon: 1 }, { unique: true });

export type CouponUsageCounterDocument = InferSchemaType<typeof couponUsageCounterSchema>;
export const CouponUsageCounterModel = model('CouponUsageCounter', couponUsageCounterSchema);
