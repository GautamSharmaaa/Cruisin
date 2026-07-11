import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-test';
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

const { orderModel } = vi.hoisted(() => ({ orderModel: { findById: vi.fn() } }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));

describe('OrderService customer access', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
