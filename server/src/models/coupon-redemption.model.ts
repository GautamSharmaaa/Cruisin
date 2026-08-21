// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const couponRedemptionSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  sequence: { type: Number, min: 1, required: true },
  status: { type: String, enum: ['reserved', 'confirmed', 'released'], required: true, index: true },
  reservedAt: { type: Date, required: true, default: Date.now },
  confirmedAt: { type: Date },
  releasedAt: { type: Date },
  expiresAt: { type: Date }
}, { timestamps: true });

couponRedemptionSchema.index({ customer: 1, coupon: 1, sequence: 1 }, { unique: true });
couponRedemptionSchema.index({ order: 1, coupon: 1 }, { unique: true });
couponRedemptionSchema.index({ status: 1, expiresAt: 1 });

export type CouponRedemptionDocument = InferSchemaType<typeof couponRedemptionSchema>;
export const CouponRedemptionModel = model('CouponRedemption', couponRedemptionSchema);
