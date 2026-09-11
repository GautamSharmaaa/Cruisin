import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'test';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';

const { couponRedemptionService, mongoTransaction, orderModel } = vi.hoisted(() => ({
  couponRedemptionService: { releaseCouponRedemption: vi.fn() },
  mongoTransaction: { withMongoTransaction: vi.fn() },
  orderModel: { findById: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() }
}));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));
vi.mock('./coupon-redemption.service.js', () => couponRedemptionService);
vi.mock('../utils/mongo-transaction.js', () => mongoTransaction);

describe('OrderService customer access', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    couponRedemptionService.releaseCouponRedemption.mockResolvedValue(false);
    mongoTransaction.withMongoTransaction.mockImplementation(async (work: (session?: undefined) => unknown) => await work(undefined));
  });

  it('rejects another customer and staff from the customer order endpoint', async () => {
    const { OrderService } = await import('./order.service.js');
    orderModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'order-id', user: 'owner-id' }) });
    await expect(OrderService.byId('order-id', { userId: 'other-id', role: 'customer' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(OrderService.byId('order-id', { userId: 'admin-id', role: 'admin' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('does not grant legacy guest orders a customer-access path', async () => {
    const { OrderService } = await import('./order.service.js');
    orderModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'legacy-order', user: undefined, sessionId: 'legacy-session' }) });
    await expect(OrderService.byId('legacy-order', { userId: 'customer-id', role: 'customer' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('normalizes stale balance-due data on legacy cancelled orders', async () => {
    const { OrderService } = await import('./order.service.js');
    orderModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'legacy-cancelled-order', user: 'owner-id', orderStatus: 'cancelled', amountDue: 912 }) });

    await expect(OrderService.byId('legacy-cancelled-order', { userId: 'owner-id', role: 'customer' })).resolves.toMatchObject({ orderStatus: 'cancelled', amountDue: 0 });
  });

  it('cancels an owned confirmed order with an auditable customer reason', async () => {
    const order = {
      user: 'owner-id',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      amountPaid: 912,
      refundAmount: 0,
      refunds: [],
      stockReserved: false,
      items: [],
      timeline: []
    };
    const cancelled = { ...order, orderStatus: 'cancelled', cancellation: { requestedBy: 'customer', reasonCode: 'wrong_item', reason: 'Ordered the wrong size or item', refundStatus: 'required' }, timeline: [{ status: 'cancelled', note: 'Customer cancelled: Ordered the wrong size or item' }] };
    orderModel.findById.mockResolvedValueOnce(order).mockResolvedValueOnce(cancelled);
    orderModel.findOneAndUpdate.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.cancelByCustomer('order-id', 'owner-id', { reasonCode: 'wrong_item' });

    expect(result).toMatchObject({
      orderStatus: 'cancelled',
      paymentStatus: 'paid',
      cancellation: { requestedBy: 'customer', reasonCode: 'wrong_item', reason: 'Ordered the wrong size or item', refundStatus: 'required' }
    });
    expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'order-id', user: 'owner-id', orderStatus: 'confirmed', paymentSettlementStartedAt: { $exists: false } }),
      expect.objectContaining({ $set: expect.objectContaining({ orderStatus: 'cancelled', amountDue: 0, stockReserved: false, cancellation: expect.objectContaining({ reasonCode: 'wrong_item' }) }) }),
      { new: false }
    );
  });

  it('treats a concurrent duplicate cancellation as idempotent', async () => {
    const order = { user: 'owner-id', orderStatus: 'confirmed', paymentStatus: 'paid', amountPaid: 912, refundAmount: 0, refunds: [], stockReserved: true, items: [], timeline: [] };
    const cancelled = { ...order, orderStatus: 'cancelled', stockReserved: false };
    orderModel.findById.mockResolvedValueOnce(order).mockResolvedValueOnce(cancelled);
    orderModel.findOneAndUpdate.mockResolvedValue(null);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.cancelByCustomer('order-id', 'owner-id', { reasonCode: 'changed_mind' })).resolves.toBe(cancelled);
    expect(orderModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects customer cancellation for another customer or after shipping', async () => {
    const { OrderService } = await import('./order.service.js');
    orderModel.findById.mockResolvedValueOnce({ user: 'owner-id', orderStatus: 'confirmed' });
    await expect(OrderService.cancelByCustomer('order-id', 'other-id', { reasonCode: 'changed_mind' })).rejects.toMatchObject({ statusCode: 403 });

    orderModel.findById.mockResolvedValueOnce({ user: 'owner-id', orderStatus: 'shipped' });
    await expect(OrderService.cancelByCustomer('order-id', 'owner-id', { reasonCode: 'changed_mind' })).rejects.toMatchObject({ statusCode: 409 });
  });
});
