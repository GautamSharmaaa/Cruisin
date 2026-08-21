import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

const { couponModel, couponRedemptionModel, couponUsageCounterModel, orderModel } = vi.hoisted(() => ({
  couponModel: { updateOne: vi.fn() },
  couponRedemptionModel: { create: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
  couponUsageCounterModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
  orderModel: { countDocuments: vi.fn() }
}));

vi.mock('../models/coupon.model.js', () => ({ CouponModel: couponModel }));
vi.mock('../models/coupon-redemption.model.js', () => ({ CouponRedemptionModel: couponRedemptionModel }));
vi.mock('../models/coupon-usage-counter.model.js', () => ({ CouponUsageCounterModel: couponUsageCounterModel }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));

import {
  assertCouponCustomerEligible,
  confirmCouponRedemption,
  couponUserUsageLimit,
  couponUsesForCustomer,
  releaseCouponRedemption,
  reserveCouponRedemption
} from './coupon-redemption.service.js';

const customerId = '665f6d8403bd2edc93800000';
const couponId = new Types.ObjectId('665f6d8403bd2edc93800001');
const orderId = new Types.ObjectId('665f6d8403bd2edc93800002');
const coupon = { _id: couponId, code: 'CRUISIN10', userUsageLimit: 1, usageLimit: 500 };

beforeEach(() => {
  vi.resetAllMocks();
  orderModel.countDocuments.mockResolvedValue(0);
  couponUsageCounterModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
  couponModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
});

describe('atomic coupon redemption', () => {
  it('keeps CRUISIN10 one-use per customer while preserving configurable limits for other coupons', () => {
    expect(couponUserUsageLimit({ ...coupon, userUsageLimit: 99 })).toBe(1);
    expect(couponUserUsageLimit({ ...coupon, code: 'LOYALTY3', userUsageLimit: 3 })).toBe(3);
  });

  it('uses the larger of immutable counters and legacy paid-order history', async () => {
    couponUsageCounterModel.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ usedCount: 1 }) })
    });
    orderModel.countDocuments.mockResolvedValue(2);

    await expect(couponUsesForCustomer(customerId, coupon)).resolves.toBe(2);
    await expect(assertCouponCustomerEligible(customerId, coupon)).rejects.toMatchObject({
      statusCode: 409,
      message: 'This coupon has already been used on this account'
    });
  });

  it('reserves both the customer allowance and global coupon allowance atomically', async () => {
    couponUsageCounterModel.findOneAndUpdate.mockResolvedValue({ nextSequence: 1 });
    couponRedemptionModel.create.mockResolvedValue({ _id: orderId });

    await expect(reserveCouponRedemption({ customerId, coupon, orderId, status: 'reserved' })).resolves.toEqual(orderId);

    expect(couponUsageCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
      { customer: new Types.ObjectId(customerId), coupon: couponId, usedCount: { $lt: 1 } },
      { $inc: { usedCount: 1, nextSequence: 1 } },
      { new: true }
    );
    expect(couponModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: couponId, isActive: true, usedCount: { $lt: 500 } }),
      { $inc: { usedCount: 1 } },
      {}
    );
    expect(couponRedemptionModel.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: new Types.ObjectId(customerId),
      coupon: couponId,
      order: orderId,
      sequence: 1,
      status: 'reserved'
    }));
  });

  it('allows only one winner when two requests race for a one-use coupon', async () => {
    couponUsageCounterModel.findOneAndUpdate
      .mockResolvedValueOnce({ nextSequence: 1 })
      .mockResolvedValueOnce(null);
    couponRedemptionModel.create.mockResolvedValue({ _id: orderId });

    const results = await Promise.allSettled([
      reserveCouponRedemption({ customerId, coupon, orderId, status: 'reserved' }),
      reserveCouponRedemption({ customerId, coupon, orderId: new Types.ObjectId(), status: 'reserved' })
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(couponModel.updateOne).toHaveBeenCalledTimes(1);
    expect(couponRedemptionModel.create).toHaveBeenCalledTimes(1);
  });

  it('confirms a reserved redemption without incrementing usage a second time', async () => {
    couponRedemptionModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await confirmCouponRedemption(String(orderId));

    expect(couponRedemptionModel.updateOne).toHaveBeenCalledWith(
      { order: String(orderId), status: 'reserved' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'confirmed' }) }),
      {}
    );
    expect(couponUsageCounterModel.updateOne).not.toHaveBeenCalled();
    expect(couponModel.updateOne).not.toHaveBeenCalled();
  });

  it('releases a reservation exactly once and restores both counters', async () => {
    couponRedemptionModel.findOneAndUpdate
      .mockResolvedValueOnce({ customer: new Types.ObjectId(customerId), coupon: couponId })
      .mockResolvedValueOnce(null);

    await expect(releaseCouponRedemption(String(orderId))).resolves.toBe(true);
    await expect(releaseCouponRedemption(String(orderId))).resolves.toBe(false);

    expect(couponUsageCounterModel.updateOne).toHaveBeenCalledTimes(1);
    expect(couponModel.updateOne).toHaveBeenCalledTimes(1);
    expect(couponUsageCounterModel.updateOne).toHaveBeenCalledWith(
      { customer: new Types.ObjectId(customerId), coupon: couponId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      {}
    );
  });
});
