// Governed by .rules v1.0
import { Types, type ClientSession } from 'mongoose';
import { CouponModel } from '../models/coupon.model.js';
import { CouponRedemptionModel } from '../models/coupon-redemption.model.js';
import { CouponUsageCounterModel } from '../models/coupon-usage-counter.model.js';
import { OrderModel } from '../models/order.model.js';
import { ApiError } from '../utils/api-error.js';

type CouponForRedemption = {
  _id: unknown;
  code: string;
  userUsageLimit?: number | null;
  usageLimit?: number | null;
};

const options = (session?: ClientSession): { session?: ClientSession } => session ? { session } : {};

export const couponUserUsageLimit = (coupon: CouponForRedemption): number => (
  coupon.code.trim().toUpperCase() === 'CRUISIN10'
    ? 1
    : Math.max(1, coupon.userUsageLimit ?? 1)
);

const historicalUses = async (customerId: string, couponCode: string, session?: ClientSession): Promise<number> => {
  const query = OrderModel.countDocuments({
    user: customerId,
    couponCode,
    orderStatus: { $ne: 'cancelled' },
    paymentStatus: { $nin: ['failed', 'cancelled'] }
  });
  if (session) query.session(session);
  return await query;
};

export const couponUsesForCustomer = async (customerId: string, coupon: CouponForRedemption): Promise<number> => {
  const [counter, legacyUses] = await Promise.all([
    CouponUsageCounterModel.findOne({ customer: customerId, coupon: coupon._id }).select('usedCount').lean(),
    historicalUses(customerId, coupon.code)
  ]);
  return Math.max(counter?.usedCount ?? 0, legacyUses);
};

export const assertCouponCustomerEligible = async (customerId: string, coupon: CouponForRedemption): Promise<void> => {
  if (await couponUsesForCustomer(customerId, coupon) >= couponUserUsageLimit(coupon)) {
    throw new ApiError(409, 'This coupon has already been used on this account');
  }
};

export const reserveCouponRedemption = async (input: {
  customerId: string;
  coupon: CouponForRedemption;
  orderId: Types.ObjectId;
  status: 'reserved' | 'confirmed';
  expiresAt?: Date;
  session?: ClientSession;
}): Promise<Types.ObjectId> => {
  const customer = new Types.ObjectId(input.customerId);
  const couponId = new Types.ObjectId(String(input.coupon._id));
  const limit = couponUserUsageLimit(input.coupon);
  const legacyUses = await historicalUses(input.customerId, input.coupon.code, input.session);
  await CouponUsageCounterModel.updateOne(
    { customer, coupon: couponId },
    { $setOnInsert: { customer, coupon: couponId, usedCount: legacyUses, nextSequence: legacyUses, limitSnapshot: limit } },
    { upsert: true, ...options(input.session) }
  );
  await CouponUsageCounterModel.updateOne(
    { customer, coupon: couponId },
    { $max: { usedCount: legacyUses, nextSequence: legacyUses }, $set: { limitSnapshot: limit } },
    options(input.session)
  );
  const counter = await CouponUsageCounterModel.findOneAndUpdate(
    { customer, coupon: couponId, usedCount: { $lt: limit } },
    { $inc: { usedCount: 1, nextSequence: 1 } },
    { new: true, ...options(input.session) }
  );
  if (!counter) throw new ApiError(409, 'This coupon has already been used on this account');
  const now = new Date();
  const couponFilter: Record<string, unknown> = { _id: couponId, isActive: true, validFrom: { $lte: now }, validUntil: { $gte: now } };
  if (input.coupon.usageLimit) couponFilter.usedCount = { $lt: input.coupon.usageLimit };
  const globalReservation = await CouponModel.updateOne(couponFilter, { $inc: { usedCount: 1 } }, options(input.session));
  if (globalReservation.modifiedCount !== 1) throw new ApiError(409, 'Coupon usage limit reached');
  const data = {
    customer,
    coupon: couponId,
    order: input.orderId,
    sequence: counter.nextSequence,
    status: input.status,
    reservedAt: new Date(),
    confirmedAt: input.status === 'confirmed' ? new Date() : undefined,
    expiresAt: input.expiresAt
  };
  const redemption = input.session
    ? (await CouponRedemptionModel.create([data], { session: input.session }))[0]
    : await CouponRedemptionModel.create(data);
  if (!redemption) throw new ApiError(409, 'Coupon reservation could not be created');
  return redemption._id as Types.ObjectId;
};

export const confirmCouponRedemption = async (orderId: string, session?: ClientSession): Promise<void> => {
  await CouponRedemptionModel.updateOne(
    { order: orderId, status: 'reserved' },
    { $set: { status: 'confirmed', confirmedAt: new Date() }, $unset: { expiresAt: 1 } },
    options(session)
  );
};

export const releaseCouponRedemption = async (orderId: string, session?: ClientSession): Promise<boolean> => {
  const redemption = await CouponRedemptionModel.findOneAndUpdate(
    { order: orderId, status: { $in: ['reserved', 'confirmed'] } },
    { $set: { status: 'released', releasedAt: new Date() }, $unset: { expiresAt: 1 } },
    { new: true, ...options(session) }
  );
  if (!redemption) return false;
  await Promise.all([
    CouponUsageCounterModel.updateOne(
      { customer: redemption.customer, coupon: redemption.coupon, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      options(session)
    ),
    CouponModel.updateOne({ _id: redemption.coupon, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, options(session))
  ]);
  return true;
};
