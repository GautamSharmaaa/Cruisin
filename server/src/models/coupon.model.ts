// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percentage', 'fixed', 'freeShipping'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    userUsageLimit: { type: Number, default: 1, min: 1 },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, required: true, index: true },
    validUntil: { type: Date, required: true, index: true },
    analyticsTestBatchId: { type: String, trim: true, index: true },
    isAnalyticsTestData: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

couponSchema.index({ code: 1, isActive: 1 });

export type CouponDocument = InferSchemaType<typeof couponSchema>;
export const CouponModel = model('Coupon', couponSchema);
