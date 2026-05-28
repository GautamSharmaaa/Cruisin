// Governed by .rules v1.0
import { CouponModel } from '../models/coupon.model.js';
import { ApiError } from '../utils/api-error.js';

export type CouponInput = Record<string, unknown>;

export const CouponService = {
  async list(): Promise<unknown[]> {
    return CouponModel.find().sort({ createdAt: -1 }).lean();
  },

  async create(input: CouponInput): Promise<unknown> {
    return CouponModel.create({ ...input, code: String(input.code).toUpperCase() });
  },

  async update(id: string, input: CouponInput): Promise<unknown> {
    const payload = input.code ? { ...input, code: String(input.code).toUpperCase() } : input;
    const coupon = await CouponModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }
    return coupon;
  },

  async remove(id: string): Promise<void> {
    const coupon = await CouponModel.findByIdAndUpdate(id, { isActive: false });
    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }
  }
};
