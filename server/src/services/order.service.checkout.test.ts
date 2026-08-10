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

const { addressBookService, cartModel, couponModel, orderModel, productModel, siteSettingsModel, webhookEventModel, userModel, paymentService, sendEmail } = vi.hoisted(() => ({
  addressBookService: { saveCheckoutAddress: vi.fn() },
  cartModel: { findOne: vi.fn(), updateOne: vi.fn(), deleteOne: vi.fn() },
  couponModel: { findOne: vi.fn(), findByIdAndUpdate: vi.fn() },
  orderModel: { create: vi.fn(), findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), findByIdAndUpdate: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn(), countDocuments: vi.fn() },
  productModel: { find: vi.fn(), updateOne: vi.fn() },
  siteSettingsModel: { findOne: vi.fn() },
  webhookEventModel: { create: vi.fn() },
  userModel: { findById: vi.fn() },
  paymentService: { getProvider: vi.fn(), refund: vi.fn(), fetchRazorpayRefund: vi.fn() },
  sendEmail: vi.fn()
}));

vi.mock('../models/cart.model.js', () => ({ CartModel: cartModel }));
vi.mock('../models/coupon.model.js', () => ({ CouponModel: couponModel }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));
vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));
vi.mock('../models/site-settings.model.js', () => ({ SiteSettingsModel: siteSettingsModel }));
vi.mock('../models/payment-webhook-event.model.js', () => ({ PaymentWebhookEventModel: webhookEventModel }));
vi.mock('../models/user.model.js', () => ({ UserModel: userModel }));
vi.mock('./address-book.service.js', () => ({ AddressBookService: addressBookService }));
vi.mock('./payment.service.js', () => ({ PaymentService: paymentService }));
vi.mock('../utils/send-email.js', () => ({ sendEmail }));

describe('OrderService authenticated checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addressBookService.saveCheckoutAddress.mockResolvedValue(null);
    siteSettingsModel.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
    });
  });

  it('creates an online order bound to the authenticated customer and server-priced cart', async () => {
    const customerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    orderModel.findOne.mockResolvedValueOnce(null);
    cartModel.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), items: [{ product: productId, variant: variantId, quantity: 1 }] }) });
    productModel.find
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: productId }]) }) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: productId, title: 'Cruisin Test Piece', status: 'published', visibility: 'visible', isActive: true, isArchived: false, images: [], costBreakdown: { manufacturing: 300, packaging: 25, marketing: 40, handling: 10, other: 5 }, variants: [{ _id: variantId, sku: 'TEST-S', size: 'S', color: 'Black', stock: 2, price: 1_000, images: [] }] }]) });
    couponModel.findOne.mockResolvedValue(null);
    const order = { _id: orderId, orderNumber: 'CR-TEST', paymentAttempts: [], timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.create.mockResolvedValue(order);
    paymentService.getProvider.mockReturnValue({ createOrder: vi.fn().mockResolvedValue({ id: 'order_test_provider', amount: 1_000, currency: 'INR', provider: 'razorpay' }) });
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.checkout(customerId, {
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      metaEventId: 'checkout:11111111-1111-4111-8111-111111111111',
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      shippingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
      billingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' }
    });

    expect(orderModel.create).toHaveBeenCalledWith(expect.objectContaining({ user: customerId, paymentMode: 'online', metaCheckoutEventId: 'checkout:11111111-1111-4111-8111-111111111111', tax: 0, shipping: 0, total: 1_000, amountPaid: 0, amountDue: 1_000, items: [expect.objectContaining({ sku: 'TEST-S', size: 'S', color: 'Black', unitCostBreakdown: { manufacturing: 300, packaging: 25, marketing: 40, handling: 10, other: 5 }, unitCostTotal: 380 })] }));
    expect(paymentService.getProvider).toHaveBeenCalledWith('razorpay');
    expect(addressBookService.saveCheckoutAddress).toHaveBeenCalledWith(customerId, expect.objectContaining({ line1: '1 Test Street' }));
    expect(result).toMatchObject({ order, payment: { id: 'order_test_provider' }, amountToPay: 1_000 });
  });

  it('uses the administrator delivery threshold as the server-authoritative order price', async () => {
    const customerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    siteSettingsModel.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          standardShippingRate: 99,
          expressShippingRate: 199,
          freeStandardShippingThreshold: 1_000
        })
      })
    });
    orderModel.findOne.mockResolvedValueOnce(null);
    cartModel.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), items: [{ product: productId, variant: variantId, quantity: 1 }] }) });
    productModel.find
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: productId }]) }) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: productId, title: 'Threshold Test', status: 'published', visibility: 'visible', isActive: true, isArchived: false, images: [], variants: [{ _id: variantId, sku: 'THRESHOLD-1', size: 'ONE', color: 'Black', stock: 2, price: 1_000, images: [] }] }]) });
    couponModel.findOne.mockResolvedValue(null);
    const order = { _id: orderId, orderNumber: 'CR-THRESHOLD', paymentAttempts: [], timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.create.mockResolvedValue(order);
    paymentService.getProvider.mockReturnValue({ createOrder: vi.fn().mockResolvedValue({ id: 'order_threshold', amount: 1_000, currency: 'INR', provider: 'razorpay' }) });
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.checkout(customerId, {
      idempotencyKey: '66666666-6666-4666-8666-666666666666',
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      shippingMethod: 'standard',
      shippingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
      billingAddress: { fullName: 'Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' }
    });

    expect(orderModel.create).toHaveBeenCalledWith(expect.objectContaining({
      subtotal: 1_000,
      shipping: 0,
      tax: 0,
      total: 1_000
    }));
    expect(result).toMatchObject({ payment: { id: 'order_threshold', amount: 1_000 }, amountToPay: 1_000 });
  });

  it('reuses the original provider order for a repeated checkout idempotency key', async () => {
    const customerId = new Types.ObjectId().toString();
    const existing = {
      _id: new Types.ObjectId(),
      user: customerId,
      paymentMode: 'online',
      paymentProvider: 'razorpay',
      razorpayOrderId: 'order_existing',
      paymentAttempts: [{ providerOrderId: 'order_existing', amount: 2_080, status: 'created' }]
    };
    orderModel.findOne.mockResolvedValueOnce(existing);
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.checkout(customerId, {
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      shippingAddress: {},
      billingAddress: {}
    });

    expect(result).toMatchObject({ order: existing, payment: { id: 'order_existing', amount: 2_080 }, amountToPay: 2_080, reused: true });
    expect(cartModel.findOne).not.toHaveBeenCalled();
    expect(paymentService.getProvider).not.toHaveBeenCalled();
    expect(orderModel.create).not.toHaveBeenCalled();
  });

  it('records a browser-reported Razorpay failure for the authenticated order', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      razorpayOrderId: 'order_failed_browser',
      paymentStatus: 'pending',
      paymentAttempts: [{ providerOrderId: 'order_failed_browser', amount: 2, status: 'created' }],
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    orderModel.findOne.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.reportPaymentFailure(String(orderId), customerId, 'order_failed_browser');

    expect(order.paymentStatus).toBe('failed');
    expect(order.paymentAttempts[0]?.status).toBe('failed');
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'failed' })]);
    expect(order.save).toHaveBeenCalledOnce();
  });

  it('rejects a browser failure report for a different provider order', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    orderModel.findOne.mockResolvedValue({ _id: orderId, user: customerId, razorpayOrderId: 'order_expected', paymentStatus: 'pending' });
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.reportPaymentFailure(String(orderId), customerId, 'order_other')).rejects.toThrow('Payment session does not match this order');
  });

  it('cancels an unpaid order when the authenticated customer dismisses Razorpay', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      razorpayOrderId: 'order_cancelled_browser',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      amountPaid: 0,
      amountDue: 2,
      stockReserved: false
    };
    const cancelled = { ...order, paymentStatus: 'cancelled', orderStatus: 'cancelled', amountDue: 0 };
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(cancelled);
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.reportPaymentCancellation(String(orderId), customerId, 'order_cancelled_browser');

    expect(result).toBe(cancelled);
    expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: String(orderId), user: customerId, razorpayOrderId: 'order_cancelled_browser', paymentStatus: 'pending', orderStatus: 'pending', amountPaid: 0 }),
      expect.objectContaining({
        $set: expect.objectContaining({ paymentStatus: 'cancelled', orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', amountDue: 0, 'paymentAttempts.$[attempt].status': 'cancelled' }),
        $push: { timeline: expect.objectContaining({ status: 'payment_cancelled' }) }
      }),
      expect.objectContaining({ new: true, arrayFilters: [{ 'attempt.providerOrderId': 'order_cancelled_browser', 'attempt.status': 'created' }] })
    );
  });

  it('does not cancel an order whose payment is already authorized', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    orderModel.findOne.mockResolvedValue({
      _id: orderId,
      user: customerId,
      razorpayOrderId: 'order_authorized',
      paymentStatus: 'authorized',
      orderStatus: 'pending',
      amountPaid: 2,
      stockReserved: false
    });
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.reportPaymentCancellation(String(orderId), customerId, 'order_authorized')).rejects.toThrow('A received payment cannot be cancelled');
    expect(orderModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reconciles a captured online payment to fully paid with no amount due', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      items: [],
      total: 2_080,
      amountPaid: 0,
      amountDue: 2_080,
      paymentMode: 'online',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      stockReserved: false,
      razorpayOrderId: 'order_test_provider',
      razorpayPaymentId: undefined,
      stripePaymentIntentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_test_provider', amount: 2_080, status: 'created' }],
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(order);
    orderModel.findById
      .mockResolvedValueOnce(order)
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ _id: orderId, user: customerId, orderNumber: 'CR-TEST' }) });
    cartModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    userModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { OrderService } = await import('./order.service.js');

    await OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_test_provider',
      razorpay_payment_id: 'pay_test_provider',
      razorpay_signature: 'valid-test-signature'
    }, customerId);

    expect(order.paymentStatus).toBe('paid');
    expect(order.amountPaid).toBe(2_080);
    expect(order.amountDue).toBe(0);
    expect(order.paymentAttempts.at(-1)).toMatchObject({ amount: 2_080, status: 'captured' });
    expect(order.paymentAttempts).toHaveLength(1);
  });

  it('records only the captured advance for a partial payment', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      items: [],
      total: 10_000,
      amountPaid: 0,
      amountDue: 10_000,
      paymentMode: 'partial',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      stockReserved: false,
      razorpayOrderId: 'order_test_partial',
      razorpayPaymentId: undefined,
      stripePaymentIntentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_test_partial', amount: 2_500, status: 'created' }],
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(order);
    orderModel.findById
      .mockResolvedValueOnce(order)
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ _id: orderId, user: customerId, orderNumber: 'CR-PARTIAL' }) });
    cartModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    userModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { OrderService } = await import('./order.service.js');

    await OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_test_partial',
      razorpay_payment_id: 'pay_test_partial',
      razorpay_signature: 'valid-test-signature'
    }, customerId);

    expect(order.paymentStatus).toBe('partially_paid');
    expect(order.amountPaid).toBe(2_500);
    expect(order.amountDue).toBe(7_500);
    expect(order.paymentAttempts.at(-1)).toMatchObject({ amount: 2_500, status: 'captured' });
    expect(order.paymentAttempts).toHaveLength(1);
  });

  it('durably records an authorized payment when stock cannot be reserved', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId, user: customerId, items: [{ product: new Types.ObjectId(), variant: new Types.ObjectId(), quantity: 1, sku: 'SOLD-OUT' }],
      total: 2_080, amountPaid: 0, amountDue: 2_080, paymentMode: 'online', paymentStatus: 'pending', orderStatus: 'pending',
      stockReserved: false, razorpayOrderId: 'order_stock_conflict', razorpayPaymentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_stock_conflict', amount: 2_080, status: 'created' }], timeline: [], save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(order);
    orderModel.findById.mockResolvedValue(order);
    productModel.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const { OrderService } = await import('./order.service.js');

    const result = await OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_stock_conflict', razorpay_payment_id: 'pay_stock_conflict', razorpay_signature: 'valid-test-signature'
    }, customerId);

    expect(result.order).toMatchObject({ paymentStatus: 'authorized', amountPaid: 2_080, amountDue: 0, paymentSettlementStartedAt: undefined });
    expect(order.paymentAttempts.at(-1)).toMatchObject({ status: 'authorized', providerPaymentId: 'pay_stock_conflict' });
    expect(cartModel.deleteOne).not.toHaveBeenCalled();
  });

  it('rejects an impossible order status transition', async () => {
    const orderId = new Types.ObjectId().toString();
    orderModel.findById.mockResolvedValue({ _id: orderId, orderStatus: 'cancelled' });
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.updateStatus(orderId, { status: 'shipped' })).rejects.toThrow('Order cannot move from cancelled to shipped');
    expect(orderModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a duplicate payment callback while settlement is in progress', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = { _id: orderId, user: customerId, paymentStatus: 'pending', paymentSettlementStartedAt: new Date() };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(null);
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_settling',
      razorpay_payment_id: 'pay_duplicate',
      razorpay_signature: 'valid-test-signature'
    }, customerId)).rejects.toThrow('Payment settlement is already in progress');
  });

  it('records a late Razorpay capture as refund-required without reopening a cancelled order', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      items: [],
      total: 2_080,
      amountPaid: 0,
      amountDue: 0,
      paymentMode: 'online',
      paymentStatus: 'cancelled',
      orderStatus: 'cancelled',
      stockReserved: false,
      razorpayOrderId: 'order_cancelled_capture',
      razorpayPaymentId: undefined,
      stripePaymentIntentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_cancelled_capture', amount: 2_080, status: 'created' }],
      cancellation: { refundStatus: 'not_required', refundAmount: 0 },
      refunds: [],
      timeline: [],
      paymentSettlementStartedAt: undefined,
      save: vi.fn().mockResolvedValue(undefined)
    };
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(null);
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.markPaymentStatus('order_cancelled_capture', 'paid', { paymentId: 'pay_after_cancel', method: 'card', event: 'Razorpay payment captured' });

    expect(order).toMatchObject({ orderStatus: 'cancelled', paymentStatus: 'paid', amountPaid: 2_080, amountDue: 0, razorpayPaymentId: 'pay_after_cancel', cancellation: { refundStatus: 'required', refundAmount: 0 } });
    expect(order.paymentAttempts).toEqual([expect.objectContaining({ providerPaymentId: 'pay_after_cancel', status: 'captured', method: 'card' })]);
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'refund_required' })]);
    expect(productModel.updateOne).not.toHaveBeenCalled();
  });

  it('keeps sequential duplicate verification idempotent for balances and stock', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    const order = {
      _id: orderId, user: customerId, items: [{ product: productId, variant: variantId, quantity: 1 }], total: 2_080, amountPaid: 0, amountDue: 2_080,
      paymentMode: 'online', paymentStatus: 'pending', orderStatus: 'pending', stockReserved: false, razorpayOrderId: 'order_idempotent', razorpayPaymentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_idempotent', amount: 2_080, status: 'created' }], timeline: [], save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValueOnce(order).mockResolvedValueOnce(null);
    orderModel.findById
      .mockResolvedValueOnce(order)
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ _id: orderId, user: customerId, orderNumber: 'CR-IDEMPOTENT' }) })
      .mockResolvedValueOnce(order);
    productModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    cartModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    userModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { OrderService } = await import('./order.service.js');
    const payload = { razorpay_order_id: 'order_idempotent', razorpay_payment_id: 'pay_idempotent', razorpay_signature: 'valid-test-signature' };

    await OrderService.verifyPayment('razorpay', payload, customerId);
    await OrderService.verifyPayment('razorpay', payload, customerId);

    expect(order.amountPaid).toBe(2_080);
    expect(order.amountDue).toBe(0);
    expect(productModel.updateOne).toHaveBeenCalledTimes(1);
    expect(order.paymentAttempts.filter((attempt) => attempt.status === 'captured')).toHaveLength(1);
    expect(order.paymentAttempts).toHaveLength(1);
  });

  it('does not overwrite a fully refunded order when payment verification is replayed', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      user: customerId,
      total: 2_080,
      amountPaid: 2_080,
      amountDue: 0,
      refundAmount: 2_080,
      paymentMode: 'online',
      paymentStatus: 'refunded',
      orderStatus: 'confirmed',
      stockReserved: true,
      razorpayOrderId: 'order_refunded_replay',
      razorpayPaymentId: 'pay_refunded_replay',
      paymentAttempts: [{ providerOrderId: 'order_refunded_replay', providerPaymentId: 'pay_refunded_replay', amount: 2_080, status: 'captured' }],
      timeline: [{ status: 'refunded', timestamp: new Date(), note: 'Razorpay refund processed' }],
      save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(null);
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_refunded_replay', razorpay_payment_id: 'pay_refunded_replay', razorpay_signature: 'valid-test-signature'
    }, customerId);

    expect(order).toMatchObject({ paymentStatus: 'refunded', amountPaid: 2_080, amountDue: 0, refundAmount: 2_080 });
    expect(order.timeline).toHaveLength(1);
    expect(productModel.updateOne).not.toHaveBeenCalled();
  });

  it('folds a legacy created/captured pair into one attempt during a verified replay', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId, user: customerId, total: 2_080, amountPaid: 2_080, amountDue: 0,
      paymentMode: 'online', paymentStatus: 'paid', orderStatus: 'confirmed', razorpayOrderId: 'order_legacy', razorpayPaymentId: 'pay_legacy',
      paymentAttempts: [
        { providerOrderId: 'order_legacy', amount: 2_080, status: 'created' },
        { providerOrderId: 'order_legacy', providerPaymentId: 'pay_legacy', amount: 2_080, status: 'captured', method: 'wallet' }
      ],
      timeline: [{ status: 'paid', timestamp: new Date(), note: 'Payment signature verified' }],
      save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValue(null);
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.verifyPayment('razorpay', {
      razorpay_order_id: 'order_legacy', razorpay_payment_id: 'pay_legacy', razorpay_signature: 'valid-test-signature'
    }, customerId);

    expect(order.paymentAttempts).toEqual([expect.objectContaining({ providerOrderId: 'order_legacy', providerPaymentId: 'pay_legacy', status: 'captured', method: 'wallet' })]);
    expect(order.timeline).toHaveLength(1);
    expect(order.save).toHaveBeenCalledOnce();
  });

  it('serializes concurrent verify and webhook settlement with one recoverable conflict', async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    const order = {
      _id: orderId, user: customerId, items: [{ product: productId, variant: variantId, quantity: 1 }], total: 3_000, amountPaid: 0, amountDue: 3_000,
      paymentMode: 'online', paymentStatus: 'pending', orderStatus: 'pending', stockReserved: false, razorpayOrderId: 'order_race', razorpayPaymentId: undefined,
      paymentAttempts: [{ providerOrderId: 'order_race', amount: 3_000, status: 'created' }], timeline: [], save: vi.fn().mockResolvedValue(undefined)
    };
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(true) });
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findOneAndUpdate.mockResolvedValueOnce(order).mockResolvedValueOnce(null);
    let findByIdCalls = 0;
    orderModel.findById.mockImplementation(() => {
      findByIdCalls += 1;
      if (findByIdCalls <= 2) return Promise.resolve(order);
      return { lean: vi.fn().mockResolvedValue({ _id: orderId, user: customerId, orderNumber: 'CR-RACE' }) };
    });
    productModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    cartModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    userModel.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { OrderService } = await import('./order.service.js');
    const payload = { razorpay_order_id: 'order_race', razorpay_payment_id: 'pay_race', razorpay_signature: 'valid-test-signature' };

    const results = await Promise.allSettled([
      OrderService.verifyPayment('razorpay', payload, customerId),
      OrderService.markPaymentStatus('order_race', 'paid', { paymentId: 'pay_race', event: 'Razorpay payment captured' })
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(order.amountPaid).toBe(3_000);
    expect(order.amountDue).toBe(0);
    expect(order.paymentStatus).toBe('paid');
    expect(productModel.updateOne).toHaveBeenCalledTimes(1);
    expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.arrayContaining([expect.objectContaining({ paymentSettlementStartedAt: expect.objectContaining({ $lt: expect.any(Date) }) })]) }),
      expect.anything(),
      expect.anything()
    );
  });

  it('marks the remaining partial-payment balance collected exactly once', async () => {
    const orderId = new Types.ObjectId().toString();
    const order = { _id: orderId, total: 10_000, amountPaid: 2_500, amountDue: 7_500, paymentMode: 'partial', paymentStatus: 'partially_paid', paymentProvider: 'razorpay', timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.markCollectionPaid(orderId, new Types.ObjectId().toString(), true);
    await OrderService.markCollectionPaid(orderId, new Types.ObjectId().toString(), true);

    expect(order).toMatchObject({ amountPaid: 10_000, amountDue: 0, paymentStatus: 'paid', paymentProvider: 'manual' });
  });

  it('rejects payment collection for a cancelled COD order', async () => {
    const orderId = new Types.ObjectId().toString();
    const order = { _id: orderId, total: 10_000, amountPaid: 0, amountDue: 0, paymentMode: 'cod', paymentStatus: 'cancelled', orderStatus: 'cancelled', timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.markCollectionPaid(orderId, new Types.ObjectId().toString(), false)).rejects.toMatchObject({ statusCode: 409 });
    expect(order.save).not.toHaveBeenCalled();
  });

  it('enforces refund bounds before calling the provider', async () => {
    const orderId = new Types.ObjectId().toString();
    const order = { _id: orderId, paymentProvider: 'razorpay', razorpayPaymentId: 'pay_refund', amountPaid: 2_000, refunds: [{ amount: 500, status: 'processed' }], timeline: [], save: vi.fn() };
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.refund(orderId, 1_501, 'too much', new Types.ObjectId().toString(), '44444444-4444-4444-8444-444444444444')).rejects.toThrow('Refund exceeds amount paid');
    expect(paymentService.refund).not.toHaveBeenCalled();
  });

  it('reserves pending provider refunds when enforcing refund bounds', async () => {
    const orderId = new Types.ObjectId().toString();
    const order = { _id: orderId, paymentProvider: 'razorpay', razorpayPaymentId: 'pay_pending_refund', amountPaid: 2_000, refunds: [{ amount: 500, status: 'pending' }], timeline: [], save: vi.fn() };
    orderModel.findById.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.refund(orderId, 1_501, 'too much while pending', new Types.ObjectId().toString(), '45454545-4545-4545-8545-454545454545')).rejects.toThrow('Refund exceeds amount paid');
    expect(paymentService.refund).not.toHaveBeenCalled();
  });

  it('records a processed provider refund and reuses the same idempotency key exactly once', async () => {
    const orderId = new Types.ObjectId().toString();
    const adminId = new Types.ObjectId().toString();
    const idempotencyKey = '55555555-5555-4555-8555-555555555555';
    const order = {
      _id: orderId,
      paymentProvider: 'razorpay',
      razorpayPaymentId: 'pay_refund_once',
      amountPaid: 2_000,
      refundAmount: 0,
      paymentStatus: 'paid',
      refunds: [],
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    orderModel.findById.mockResolvedValue(order);
    paymentService.refund.mockResolvedValue({ id: 'rfnd_once', amount: 500, status: 'processed' });
    const { OrderService } = await import('./order.service.js');

    const created = await OrderService.refund(orderId, 500, 'partial QA', adminId, idempotencyKey);
    const replayed = await OrderService.refund(orderId, 500, 'partial QA', adminId, idempotencyKey);

    expect(created).toEqual({ id: 'rfnd_once', amount: 500, status: 'processed' });
    expect(replayed).toEqual({ id: 'rfnd_once', amount: 500, status: 'processed', reused: true });
    expect(paymentService.refund).toHaveBeenCalledTimes(1);
    expect(paymentService.refund).toHaveBeenCalledWith('razorpay', 'pay_refund_once', 500, idempotencyKey, { orderId, reason: 'partial QA' });
    expect(order).toMatchObject({ refundAmount: 500, paymentStatus: 'partially_refunded' });
    expect(order.refunds).toEqual([expect.objectContaining({ providerRefundId: 'rfnd_once', idempotencyKey, amount: 500, status: 'processed', reason: 'partial QA' })]);
    expect(order.timeline).toHaveLength(1);
  });

  it('rejects reuse of a refund idempotency key with different details', async () => {
    const orderId = new Types.ObjectId().toString();
    const idempotencyKey = '66666666-6666-4666-8666-666666666666';
    orderModel.findById.mockResolvedValue({
      _id: orderId,
      paymentProvider: 'razorpay',
      razorpayPaymentId: 'pay_refund_conflict',
      amountPaid: 2_000,
      refunds: [{ providerRefundId: 'rfnd_existing', idempotencyKey, amount: 500, status: 'processed', reason: 'original' }],
      timeline: [],
      save: vi.fn()
    });
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.refund(orderId, 600, 'changed', new Types.ObjectId().toString(), idempotencyKey)).rejects.toThrow('Refund idempotency key was already used with different details');
    expect(paymentService.refund).not.toHaveBeenCalled();
  });

  it('does not mark an order refunded when a refund.failed webhook arrives', async () => {
    const refund = { providerRefundId: 'rfnd_failed', amount: 500, status: 'created' };
    const order = { paymentStatus: 'paid', amountPaid: 2_000, refundAmount: 0, refunds: [refund], timeline: [], save: vi.fn().mockResolvedValue(undefined) };
    orderModel.findOne.mockResolvedValue(order);
    const { OrderService } = await import('./order.service.js');

    await OrderService.recordRefundWebhook('pay_failed_refund', 'rfnd_failed', 'failed');

    expect(refund.status).toBe('failed');
    expect(order).toMatchObject({ paymentStatus: 'paid', refundAmount: 0 });
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'refund_failed' })]);
  });

  it('synchronizes a processed Razorpay refund and its cancellation state', async () => {
    const orderId = new Types.ObjectId().toString();
    const refund = { providerRefundId: 'rfnd_sync', amount: 500, status: 'pending' };
    const order = {
      _id: orderId,
      paymentProvider: 'razorpay',
      razorpayPaymentId: 'pay_sync',
      paymentStatus: 'paid',
      amountPaid: 2_000,
      refundAmount: 0,
      refunds: [refund],
      cancellation: { refundStatus: 'pending', refundAmount: 0 },
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    orderModel.findById.mockResolvedValue(order);
    paymentService.fetchRazorpayRefund.mockResolvedValue({ id: 'rfnd_sync', amount: 500, status: 'processed' });
    const { OrderService } = await import('./order.service.js');

    await OrderService.syncLatestRefund(orderId);

    expect(paymentService.fetchRazorpayRefund).toHaveBeenCalledWith('rfnd_sync');
    expect(refund.status).toBe('processed');
    expect(order).toMatchObject({ paymentStatus: 'partially_refunded', refundAmount: 500, cancellation: { refundStatus: 'partially_refunded', refundAmount: 500 } });
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'partially_refunded' })]);
  });

  it('fully refunds a cancelled partial order when the captured advance is returned', async () => {
    const orderId = new Types.ObjectId().toString();
    const refund = { providerRefundId: 'rfnd_partial_advance', amount: 250, status: 'pending' };
    const order = {
      _id: orderId,
      total: 1_000,
      paymentMode: 'partial',
      paymentProvider: 'razorpay',
      razorpayPaymentId: 'pay_partial_advance',
      paymentStatus: 'partially_paid',
      orderStatus: 'cancelled',
      amountPaid: 250,
      amountDue: 0,
      refundAmount: 0,
      refunds: [refund],
      cancellation: { refundStatus: 'pending', refundAmount: 0 },
      timeline: [],
      save: vi.fn().mockResolvedValue(undefined)
    };
    orderModel.findById.mockResolvedValue(order);
    paymentService.fetchRazorpayRefund.mockResolvedValue({ id: 'rfnd_partial_advance', amount: 250, status: 'processed' });
    const { OrderService } = await import('./order.service.js');

    await OrderService.syncLatestRefund(orderId);

    expect(order).toMatchObject({
      paymentStatus: 'refunded',
      amountPaid: 250,
      amountDue: 0,
      refundAmount: 250,
      cancellation: { refundStatus: 'refunded', refundAmount: 250 }
    });
    expect(order.timeline).toEqual([expect.objectContaining({ status: 'refunded' })]);
  });

  it('leaves balances unpaid when provider verification fails', async () => {
    const customerId = new Types.ObjectId().toString();
    paymentService.getProvider.mockReturnValue({ verifyPayment: vi.fn().mockResolvedValue(false) });
    const { OrderService } = await import('./order.service.js');
    const result = await OrderService.verifyPayment('razorpay', { razorpay_order_id: 'tampered', razorpay_signature: 'invalid' }, customerId);
    expect(result).toEqual({ verified: false });
    expect(orderModel.findOne).not.toHaveBeenCalled();
  });

  it('ignores duplicate provider webhook event IDs', async () => {
    webhookEventModel.create.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 11000 }));
    const { OrderService } = await import('./order.service.js');
    await expect(OrderService.processRazorpayWebhook('evt_duplicate', 'payment.captured', {})).resolves.toBe(false);
    expect(orderModel.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['cancelled', 'processing'],
    ['delivered', 'processing'],
    ['returned', 'processing']
  ])('rejects terminal or backward order transition %s -> %s', async (from, to) => {
    const orderId = new Types.ObjectId().toString();
    orderModel.findById.mockResolvedValue({ _id: orderId, orderStatus: from });
    const { OrderService } = await import('./order.service.js');
    await expect(OrderService.updateStatus(orderId, { status: to })).rejects.toThrow(`Order cannot move from ${from} to ${to}`);
  });

  it('accepts a valid transition and rejects a concurrent stale write', async () => {
    const orderId = new Types.ObjectId().toString();
    orderModel.findById.mockResolvedValue({ _id: orderId, orderStatus: 'placed' });
    orderModel.findOneAndUpdate.mockResolvedValueOnce({ _id: orderId, orderStatus: 'confirmed' }).mockResolvedValueOnce(null);
    const { OrderService } = await import('./order.service.js');
    await expect(OrderService.updateStatus(orderId, { status: 'confirmed' })).resolves.toMatchObject({ orderStatus: 'confirmed' });
    await expect(OrderService.updateStatus(orderId, { status: 'confirmed' })).rejects.toThrow('Order status changed; refresh and try again');
  });

  it('stores only a data-minimized webhook audit payload', async () => {
    webhookEventModel.create.mockResolvedValue({});
    const { OrderService } = await import('./order.service.js');
    await OrderService.processRazorpayWebhook('evt_qa', 'payment.pending', {
      payment: { entity: { id: 'pay_qa', order_id: 'order_qa', amount: 2500, status: 'created', email: 'customer@example.com', contact: '+919876543210', notes: { address: 'private' } } }
    });
    expect(webhookEventModel.create).toHaveBeenCalledWith(expect.objectContaining({
      payload: { payment: { id: 'pay_qa', order_id: 'order_qa', amount: 2500, status: 'created' } }
    }));
  });

  it('enforces the configured per-customer coupon usage limit at checkout', async () => {
    const customerId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    orderModel.findOne.mockResolvedValueOnce(null);
    cartModel.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), items: [{ product: productId, variant: variantId, quantity: 1 }] }) });
    productModel.find
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: productId }]) }) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: productId, title: 'Coupon Test Piece', status: 'published', visibility: 'visible', isActive: true, isArchived: false, images: [], variants: [{ _id: variantId, sku: 'COUPON-S', stock: 2, price: 1_000, images: [] }] }]) });
    couponModel.findOne.mockResolvedValue({ code: 'ONCE', userUsageLimit: 1 });
    orderModel.countDocuments.mockResolvedValue(1);
    const { OrderService } = await import('./order.service.js');

    await expect(OrderService.checkout(customerId, {
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
      paymentMethod: 'razorpay',
      paymentMode: 'online',
      couponCode: 'once',
      shippingAddress: {},
      billingAddress: {}
    })).rejects.toThrow('Coupon usage limit reached for this customer');
    expect(orderModel.create).not.toHaveBeenCalled();
  });
});
