import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
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

const { cartModel, couponModel, orderModel, productModel, webhookEventModel, userModel, paymentService, sendEmail } = vi.hoisted(() => ({
  cartModel: { findOne: vi.fn(), updateOne: vi.fn(), deleteOne: vi.fn() },
  couponModel: { findOne: vi.fn(), findByIdAndUpdate: vi.fn() },
  orderModel: { create: vi.fn(), findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), findByIdAndUpdate: vi.fn() },
  productModel: { find: vi.fn(), updateOne: vi.fn() },
  webhookEventModel: { create: vi.fn() },
  userModel: { findById: vi.fn() },
  paymentService: { getProvider: vi.fn(), refund: vi.fn() },
  sendEmail: vi.fn()
}));

vi.mock('../models/cart.model.js', () => ({ CartModel: cartModel }));
vi.mock('../models/coupon.model.js', () => ({ CouponModel: couponModel }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));
vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));
vi.mock('../models/payment-webhook-event.model.js', () => ({ PaymentWebhookEventModel: webhookEventModel }));
vi.mock('../models/user.model.js', () => ({ UserModel: userModel }));
vi.mock('./payment.service.js', () => ({ PaymentService: paymentService }));
vi.mock('../utils/send-email.js', () => ({ sendEmail }));

describe('OrderService authenticated checkout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an online order bound to the authenticated customer and server-priced cart', async () => {
    const customerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    cartModel.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), items: [{ product: productId, variant: variantId, quantity: 1 }] }) });
    productModel.find
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: productId }]) }) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: productId, title: 'Cruisin Test Piece', status: 'published', visibility: 'visible', isActive: true, isArchived: false, images: [], variants: [{ _id: variantId, sku: 'TEST-S', stock: 2, price: 1_000, images: [] }] }]) });
    couponModel.findOne.mockResolvedValue(null);
    const order = { _id: orderId, orderNumber: 'CR-TEST', paymentAttempts: [], timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.create.mockResolvedValue(order);
    paymentService.getProvider.mockReturnValue({ createOrder: vi.fn().mockResolvedValue({ id: 'order_test_provider', amount: 2_080, currency: 'INR', provider: 'razorpay' }) });
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.checkout(customerId, {
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      shippingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
      billingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' }
    });

    expect(orderModel.create).toHaveBeenCalledWith(expect.objectContaining({ user: customerId, paymentMode: 'online', total: 2_080, amountPaid: 0, amountDue: 2_080 }));
    expect(paymentService.getProvider).toHaveBeenCalledWith('razorpay');
    expect(result).toMatchObject({ order, payment: { id: 'order_test_provider' }, amountToPay: 2_080 });
  });
});
