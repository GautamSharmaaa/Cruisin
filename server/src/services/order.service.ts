import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentWebhookEventModel } from '../models/payment-webhook-event.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import type { CheckoutPaymentMode, PaymentMethod } from '../types/payment.types.js';
import { ApiError } from '../utils/api-error.js';
import { calculateCouponDiscount } from '../utils/coupon-discount.js';
import { sendEmail } from '../utils/send-email.js';
import { logger } from '../utils/logger.js';
import { PaymentService } from './payment.service.js';

type AddressInput = Record<string, unknown>;
type CheckoutInput = { shippingAddress: AddressInput; billingAddress: AddressInput; paymentMethod: PaymentMethod; paymentMode?: CheckoutPaymentMode; couponCode?: string };

const idString = (value: unknown): string => value instanceof Types.ObjectId ? value.toString() : typeof value === 'string' ? value : value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : '';
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const orderNumber = (): string => `CR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const notifyOrderConfirmation = async (orderId: string): Promise<void> => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order?.user) return;
  const user = await UserModel.findById(order.user).lean();
  if (!user?.email) return;
  try {
    await sendEmail({ to: user.email, subject: 'Cruisin order confirmed', text: `Your Cruisin order ${order.orderNumber ?? orderId} is confirmed.`, html: `<p>Your Cruisin order <strong>${order.orderNumber ?? orderId}</strong> is confirmed.</p>` });
  } catch {
    // Order creation and payment settlement must not report failure after durable state is committed.
    logger.error('Order confirmation email could not be sent', { orderId });
  }
};

const reserveStock = async (orderId: string): Promise<void> => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.stockReserved) return;
  const reserved: Array<{ product: Types.ObjectId; variant: Types.ObjectId; quantity: number }> = [];
  try {
    for (const item of order.items) {
      const result = await ProductModel.updateOne({ _id: item.product, status: 'published', visibility: 'visible', isActive: true, isArchived: { $ne: true }, variants: { $elemMatch: { _id: item.variant, enabled: { $ne: false }, stock: { $gte: item.quantity } } } }, { $inc: { 'variants.$.stock': -item.quantity } });
      if (result.modifiedCount === 0) throw new ApiError(409, `Insufficient stock for ${item.sku}`);
      reserved.push({ product: item.product as Types.ObjectId, variant: item.variant as Types.ObjectId, quantity: item.quantity });
    }
    order.stockReserved = true;
    await order.save();
  } catch (error) {
    await Promise.all(reserved.map((item) => ProductModel.updateOne({ _id: item.product, 'variants._id': item.variant }, { $inc: { 'variants.$.stock': item.quantity } })));
    throw error;
  }
};

const restoreStock = async (order: { stockReserved?: boolean; items: Array<{ product: Types.ObjectId; variant: Types.ObjectId; quantity: number }> }): Promise<void> => {
  if (!order.stockReserved) return;
  await Promise.all(order.items.map((item) => ProductModel.updateOne({ _id: item.product, 'variants._id': item.variant }, { $inc: { 'variants.$.stock': item.quantity } })));
};

const createPricedItems = async (cartItems: Array<{ product: unknown; variant: unknown; quantity: number }>) => {
  const productIds = [...new Set(cartItems.map((item) => idString(item.product)).filter((id) => Types.ObjectId.isValid(id)))];
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return cartItems.map((cartItem) => {
    const productId = idString(cartItem.product);
    const variantId = idString(cartItem.variant);
    const product = byId.get(productId);
    if (!product || product.status !== 'published' || product.visibility !== 'visible' || !product.isActive || product.isArchived) throw new ApiError(409, 'A product in your bag is no longer available');
    const variant = product.variants.find((candidate) => String(candidate._id) === variantId);
    if (!variant || variant.enabled === false || variant.stock < cartItem.quantity) throw new ApiError(409, `Selected variant is unavailable for ${product.title}`);
    return { product: new Types.ObjectId(productId), variant: new Types.ObjectId(variantId), title: product.title, sku: variant.sku, quantity: cartItem.quantity, price: money(variant.priceOverride ?? variant.price), image: variant.images[0]?.url ?? product.images[0]?.url ?? '/product.webp' };
  });
};

// A cart can outlive a product import or catalogue deletion. Remove only references
// to products that no longer exist, then require the customer to review before an
// order can be created. This keeps an abandoned cart from blocking valid items.
const priceCart = async (cart: { _id: unknown; items: Array<{ product: unknown; variant: unknown; quantity: number }> }) => {
  const productIds = [...new Set(cart.items.map((item) => idString(item.product)).filter((id) => Types.ObjectId.isValid(id)))];
  const existing = await ProductModel.find({ _id: { $in: productIds } }).select('_id').lean();
  const existingIds = new Set(existing.map((product) => String(product._id)));
  const removedProductIds = productIds.filter((id) => !existingIds.has(id));
  if (removedProductIds.length > 0) {
    await CartModel.updateOne({ _id: cart._id }, { $pull: { items: { product: { $in: removedProductIds.map((id) => new Types.ObjectId(id)) } } } });
    throw new ApiError(409, 'Some items are no longer available and were removed from your bag');
  }
  return createPricedItems(cart.items);
};

const completeOnlinePayment = async (orderId: string, paymentId: string, note: string, method?: string): Promise<unknown> => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid') return order;
  try {
    await reserveStock(orderId);
  } catch (error) {
    order.paymentStatus = 'authorized';
    order.razorpayPaymentId = paymentId;
    order.paymentAttempts.push({ providerOrderId: order.razorpayOrderId, providerPaymentId: paymentId, amount: order.paymentMode === 'partial' ? order.amountPaid : order.total, status: 'authorized', errorDescription: 'Payment received; stock requires manual resolution' });
    order.timeline.push({ status: 'authorized', timestamp: new Date(), note: 'Payment received; inventory review required' });
    await order.save();
    return order;
  }
  const paid = order.paymentMode === 'partial' ? order.amountPaid : order.total;
  order.razorpayPaymentId = paymentId;
  order.paymentStatus = order.paymentMode === 'partial' ? 'partially_paid' : 'paid';
  order.orderStatus = 'confirmed';
  order.paymentAttempts.push({ providerOrderId: order.razorpayOrderId, providerPaymentId: paymentId, amount: paid, status: 'captured', method });
  order.timeline.push({ status: order.paymentStatus, timestamp: new Date(), note });
  await order.save();
  await CartModel.deleteOne({ user: order.user });
  await notifyOrderConfirmation(orderId);
  return order;
};

export const OrderService = {
  async checkout(userId: string, input: CheckoutInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to place an order');
    const mode = input.paymentMode ?? (input.paymentMethod === 'cod' ? 'cod' : 'online');
    if (mode === 'cod' || input.paymentMethod === 'cod') return this.createCodOrder(userId, input);
    if (input.paymentMethod !== 'razorpay' && input.paymentMethod !== 'stripe') throw new ApiError(400, 'Unsupported payment method');
    if (mode === 'partial' && (!env.PARTIAL_PAYMENT_ENABLED || input.paymentMethod !== 'razorpay')) throw new ApiError(400, 'Partial payment is unavailable');
    const cart = await CartModel.findOne({ user: userId }).lean();
    if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
    const items = await priceCart(cart);
    const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const coupon = input.couponCode ? await CouponModel.findOne({ code: input.couponCode.toUpperCase(), isActive: true }) : null;
    const couponResult = coupon ? await calculateCouponDiscount(coupon, items) : null;
    const discount = money(couponResult?.discount ?? 0);
    const shipping = couponResult?.freeShipping || subtotal - discount >= 25000 ? 0 : 900;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = money(subtotal - discount + shipping + tax);
    if (mode === 'partial' && total < env.MIN_PARTIAL_PAYMENT_ORDER_VALUE) throw new ApiError(400, 'Order value is below the partial-payment minimum');
    const advance = mode === 'partial' ? money(Math.min(total, env.PARTIAL_PAYMENT_FIXED_AMOUNT ?? total * ((env.PARTIAL_PAYMENT_PERCENTAGE ?? 0) / 100))) : total;
    if (advance <= 0) throw new ApiError(400, 'Invalid partial-payment configuration');
    const order = await OrderModel.create({ orderNumber: orderNumber(), user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: input.paymentMethod, paymentMode: mode, paymentProvider: input.paymentMethod, subtotal, tax, shipping, discount, codFee: 0, total, amountPaid: mode === 'partial' ? advance : 0, amountDue: total, couponCode: coupon?.code, timeline: [{ status: 'pending', timestamp: new Date(), note: coupon ? `Order created with coupon ${coupon.code}` : 'Order created' }] });
    try {
      const payment = await PaymentService.getProvider(input.paymentMethod).createOrder(advance, 'INR', { localOrderId: String(order._id), orderNumber: order.orderNumber ?? String(order._id), paymentMode: mode });
      if (input.paymentMethod === 'razorpay') order.razorpayOrderId = payment.id;
      else order.stripePaymentIntentId = payment.id;
      order.paymentAttempts.push({ providerOrderId: payment.id, amount: advance, status: 'created' });
      await order.save();
      if (coupon) await CouponModel.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
      return { order, payment, amountToPay: advance };
    } catch (error) {
      order.paymentStatus = 'failed';
      order.timeline.push({ status: 'failed', timestamp: new Date(), note: 'Payment session could not be created' });
      await order.save();
      throw error;
    }
  },

  async createCodOrder(userId: string, input: CheckoutInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to place an order');
    if (!env.COD_ENABLED) throw new ApiError(400, 'Cash on delivery is unavailable');
    const cart = await CartModel.findOne({ user: userId }).lean();
    if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
    const items = await priceCart(cart);
    const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const coupon = input.couponCode ? await CouponModel.findOne({ code: input.couponCode.toUpperCase(), isActive: true }) : null;
    const couponResult = coupon ? await calculateCouponDiscount(coupon, items) : null;
    const discount = money(couponResult?.discount ?? 0);
    const shipping = couponResult?.freeShipping || subtotal - discount >= 25000 ? 0 : 900;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = money(subtotal - discount + shipping + tax + env.COD_FEE);
    if (total > env.MAX_COD_ORDER_VALUE) throw new ApiError(400, 'Cash on delivery is unavailable for this order value');
    const order = await OrderModel.create({ orderNumber: orderNumber(), user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: 'cod', paymentMode: 'cod', paymentProvider: 'cod', paymentStatus: 'cod_pending', orderStatus: 'placed', subtotal, tax, shipping, discount, codFee: env.COD_FEE, total, amountPaid: 0, amountDue: total, couponCode: coupon?.code, timeline: [{ status: 'placed', timestamp: new Date(), note: 'COD order placed; payment due on delivery' }] });
    await reserveStock(String(order._id));
    if (coupon) await CouponModel.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
    await CartModel.deleteOne({ user: order.user });
    await notifyOrderConfirmation(String(order._id));
    return { order, payment: null, amountToPay: 0 };
  },

  async verifyPayment(method: PaymentMethod, payload: Record<string, unknown>, userId: string): Promise<{ verified: boolean; order?: unknown }> {
    if (!userId) throw new ApiError(401, 'Sign in is required to verify a payment');
    if (method === 'cod') throw new ApiError(400, 'COD payments cannot be verified online');
    const verified = await PaymentService.getProvider(method).verifyPayment(payload);
    if (!verified) return { verified: false };
    const providerOrderId = typeof payload.razorpay_order_id === 'string' ? payload.razorpay_order_id : undefined;
    const paymentId = typeof payload.razorpay_payment_id === 'string' ? payload.razorpay_payment_id : typeof payload.paymentIntentId === 'string' ? payload.paymentIntentId : '';
    const order = await OrderModel.findOne(providerOrderId ? { razorpayOrderId: providerOrderId } : { stripePaymentIntentId: paymentId });
    if (!order) throw new ApiError(404, 'Order not found for payment');
    if (String(order.user) !== userId) throw new ApiError(403, 'Order access denied');
    const settled = await completeOnlinePayment(String(order._id), paymentId, 'Payment signature verified');
    return { verified: true, order: settled };
  },

  async markPaymentStatus(providerOrderId: string, status: 'paid' | 'failed' | 'authorized', details: { paymentId?: string; method?: string; event?: string } = {}): Promise<unknown | null> {
    const order = await OrderModel.findOne({ $or: [{ razorpayOrderId: providerOrderId }, { stripePaymentIntentId: providerOrderId }] });
    if (!order) return null;
    if (status === 'paid') return completeOnlinePayment(String(order._id), details.paymentId ?? order.razorpayPaymentId ?? providerOrderId, details.event ?? 'Webhook payment confirmed', details.method);
    if (status === 'authorized' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'authorized';
      order.timeline.push({ status: 'authorized', timestamp: new Date(), note: details.event ?? 'Payment authorized' });
    } else if (status === 'failed' && !['paid', 'partially_paid'].includes(order.paymentStatus)) {
      order.paymentStatus = 'failed';
      order.timeline.push({ status: 'failed', timestamp: new Date(), note: details.event ?? 'Payment failed' });
    }
    await order.save();
    return order;
  },

  async processRazorpayWebhook(eventId: string, eventType: string, payload: Record<string, unknown>): Promise<boolean> {
    try { await PaymentWebhookEventModel.create({ provider: 'razorpay', eventId, eventType, payload }); } catch (error: unknown) { if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) return false; throw error; }
    const payment = payload.payment && typeof payload.payment === 'object' && 'entity' in payload.payment ? (payload.payment as { entity?: Record<string, unknown> }).entity : undefined;
    const refund = payload.refund && typeof payload.refund === 'object' && 'entity' in payload.refund ? (payload.refund as { entity?: Record<string, unknown> }).entity : undefined;
    const providerOrderId = typeof payment?.order_id === 'string' ? payment.order_id : typeof payload.order === 'object' && payload.order && 'entity' in payload.order ? String((payload.order as { entity?: { id?: string } }).entity?.id ?? '') : '';
    if (eventType === 'payment.authorized' && providerOrderId) await this.markPaymentStatus(providerOrderId, 'authorized', { paymentId: typeof payment?.id === 'string' ? payment.id : undefined, method: typeof payment?.method === 'string' ? payment.method : undefined, event: 'Razorpay payment authorized' });
    if ((eventType === 'payment.captured' || eventType === 'order.paid') && providerOrderId) await this.markPaymentStatus(providerOrderId, 'paid', { paymentId: typeof payment?.id === 'string' ? payment.id : undefined, method: typeof payment?.method === 'string' ? payment.method : undefined, event: 'Razorpay payment captured' });
    if (eventType === 'payment.failed' && providerOrderId) await this.markPaymentStatus(providerOrderId, 'failed', { event: 'Razorpay payment failed' });
    if (refund && (eventType === 'refund.processed' || eventType === 'refund.failed')) await this.recordRefundWebhook(String(refund.payment_id ?? ''), String(refund.id ?? ''), eventType === 'refund.processed' ? 'processed' : 'failed');
    return true;
  },

  async recordRefundWebhook(paymentId: string, refundId: string, status: 'processed' | 'failed'): Promise<void> {
    const order = await OrderModel.findOne({ razorpayPaymentId: paymentId });
    if (!order) return;
    const refund = order.refunds.find((candidate) => candidate.providerRefundId === refundId);
    if (!refund) return;
    refund.status = status;
    const refunded = order.refunds.filter((candidate) => candidate.status === 'processed').reduce((sum, candidate) => sum + candidate.amount, 0);
    order.refundAmount = refunded;
    order.paymentStatus = refunded >= order.amountPaid ? 'refunded' : 'partially_refunded';
    order.timeline.push({ status: order.paymentStatus, timestamp: new Date(), note: `Razorpay refund ${status}` });
    await order.save();
  },

  async refund(orderId: string, amount: number, reason: string | undefined, adminId: string): Promise<unknown> {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentProvider !== 'razorpay' || !order.razorpayPaymentId) throw new ApiError(400, 'Only captured online payments can be refunded through Razorpay');
    const alreadyRefunded = order.refunds.filter((refund) => ['created', 'processed'].includes(refund.status)).reduce((sum, refund) => sum + refund.amount, 0);
    if (amount > order.amountPaid - alreadyRefunded) throw new ApiError(400, 'Refund exceeds amount paid');
    const refund = await PaymentService.refund('razorpay', order.razorpayPaymentId, amount);
    if (order.refunds.some((existing) => existing.providerRefundId === refund.id)) return refund;
    order.refunds.push({ providerRefundId: refund.id, amount, status: refund.status, reason, requestedBy: new Types.ObjectId(adminId) });
    order.timeline.push({ status: 'refund_pending', timestamp: new Date(), note: reason ? `Refund requested: ${reason}` : 'Refund requested' });
    await order.save();
    return refund;
  },

  async markCollectionPaid(id: string, adminId: string, partial: boolean): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (partial ? order.paymentMode !== 'partial' : order.paymentMode !== 'cod') throw new ApiError(400, 'Payment mode does not match this action');
    order.amountPaid = order.total;
    order.amountDue = 0;
    order.paymentStatus = 'paid';
    order.paymentProvider = partial ? 'manual' : 'cod';
    order.timeline.push({ status: 'paid', timestamp: new Date(), note: partial ? `Remaining amount collected by admin ${adminId}` : `COD collected by admin ${adminId}` });
    await order.save();
    return order;
  },

  async cancel(id: string, note?: string): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus === 'cancelled') return order;
    await restoreStock(order as never);
    order.stockReserved = false;
    order.orderStatus = 'cancelled';
    order.paymentStatus = order.amountPaid > 0 ? order.paymentStatus : 'cancelled';
    order.timeline.push({ status: 'cancelled', timestamp: new Date(), note: note ?? 'Order cancelled' });
    await order.save();
    return order;
  },

  async list(userId: string): Promise<unknown[]> { return OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean(); },
  async adminList(): Promise<unknown[]> { return OrderModel.find().sort({ createdAt: -1 }).limit(200).lean(); },
  async adminById(id: string): Promise<unknown> { const order = await OrderModel.findById(id).lean(); if (!order) throw new ApiError(404, 'Order not found'); return order; },
  async byId(id: string, user: { userId: string; role: string } | undefined): Promise<unknown> {
    const order = await OrderModel.findById(id).lean();
    if (!order) throw new ApiError(404, 'Order not found');
    if (!user || !order.user || String(order.user) !== user.userId) throw new ApiError(403, 'Order access denied');
    return order;
  },
  async updateStatus(id: string, input: { status: string; note?: string; trackingNumber?: string }): Promise<unknown> { if (input.status === 'cancelled') return this.cancel(id, input.note); const order = await OrderModel.findByIdAndUpdate(id, { orderStatus: input.status, trackingNumber: input.trackingNumber, $push: { timeline: { status: input.status, timestamp: new Date(), note: input.note } } }, { new: true }); if (!order) throw new ApiError(404, 'Order not found'); return order; }
};
