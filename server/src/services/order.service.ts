import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentWebhookEventModel } from '../models/payment-webhook-event.model.js';
import { ProductModel } from '../models/product.model.js';
import { SiteSettingsModel } from '../models/site-settings.model.js';
import { UserModel } from '../models/user.model.js';
import type { CheckoutPaymentMode, PaymentMethod } from '../types/payment.types.js';
import { ApiError } from '../utils/api-error.js';
import { calculateCouponDiscount } from '../utils/coupon-discount.js';
import { sendEmail } from '../utils/send-email.js';
import { logger } from '../utils/logger.js';
import { calculateShippingRate, type ShippingMethod } from '../utils/shipping-rate.js';
import { PaymentService } from './payment.service.js';

type AddressInput = Record<string, unknown>;
type CheckoutInput = { shippingAddress: AddressInput; billingAddress: AddressInput; paymentMethod: PaymentMethod; paymentMode?: CheckoutPaymentMode; shippingMethod?: ShippingMethod; couponCode?: string; idempotencyKey: string };

const idString = (value: unknown): string => value instanceof Types.ObjectId ? value.toString() : typeof value === 'string' ? value : value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : '';
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const shippingSettings = async (): Promise<{ standardShippingRate?: number; expressShippingRate?: number; freeStandardShippingThreshold?: number }> => {
  const settings = await SiteSettingsModel.findOne({ singletonKey: 'global' }).select('standardShippingRate expressShippingRate freeStandardShippingThreshold').lean();
  return settings ?? {};
};
const orderNumber = (): string => `CR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const orderStatusTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  returned: [],
  cancelled: []
};
const customerCancellationReasons = {
  changed_mind: 'Changed my mind',
  wrong_item: 'Ordered the wrong size or item',
  delivery_too_slow: 'Delivery timing no longer works',
  found_better_option: 'Found a better alternative',
  other: 'Other reason'
} as const;
type CustomerCancellationReasonCode = keyof typeof customerCancellationReasons;
type CustomerCancellationInput = { reasonCode: CustomerCancellationReasonCode; details?: string };
const customerCancellableStatuses = new Set(['pending', 'placed', 'confirmed', 'processing']);
const normalizeOrderRead = (order: unknown): unknown => {
  if (!order || typeof order !== 'object') return order;
  const view = order as { orderStatus?: string; amountDue?: number };
  return view.orderStatus === 'cancelled' && view.amountDue !== 0 ? { ...order, amountDue: 0 } : order;
};
type CancellationRefundOrder = {
  amountPaid: number;
  refundAmount?: number | null;
  refunds: Array<{ amount: number; status: string }>;
  cancellation?: { refundStatus: string; refundAmount: number } | null;
};
const reconcileCancellationRefundState = (order: CancellationRefundOrder): void => {
  if (!order.cancellation) return;
  const processed = money(order.refunds.filter((refund) => refund.status === 'processed').reduce((sum, refund) => sum + refund.amount, 0));
  const pending = order.refunds.some((refund) => ['created', 'pending'].includes(refund.status));
  const failed = order.refunds.some((refund) => refund.status === 'failed');
  order.cancellation.refundAmount = processed;
  if (order.amountPaid <= 0) order.cancellation.refundStatus = 'not_required';
  else if (processed >= order.amountPaid) order.cancellation.refundStatus = 'refunded';
  else if (pending) order.cancellation.refundStatus = 'pending';
  else if (processed > 0) order.cancellation.refundStatus = 'partially_refunded';
  else if (failed) order.cancellation.refundStatus = 'failed';
  else order.cancellation.refundStatus = 'required';
};
const webhookEntity = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && 'entity' in value && (value as { entity?: unknown }).entity && typeof (value as { entity?: unknown }).entity === 'object' ? (value as { entity: Record<string, unknown> }).entity : undefined;
const webhookAuditPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const allowed = ['id', 'order_id', 'payment_id', 'amount', 'currency', 'status', 'method', 'captured', 'error_code', 'error_source', 'error_step', 'error_reason'];
  const select = (entity: Record<string, unknown> | undefined): Record<string, unknown> | undefined => entity ? Object.fromEntries(allowed.flatMap((key) => entity[key] === undefined ? [] : [[key, entity[key]]])) : undefined;
  return Object.fromEntries([
    ['payment', select(webhookEntity(payload.payment))],
    ['refund', select(webhookEntity(payload.refund))],
    ['order', select(webhookEntity(payload.order))]
  ].filter((entry) => entry[1] !== undefined));
};

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
    return { product: new Types.ObjectId(productId), variant: new Types.ObjectId(variantId), title: product.title, sku: variant.sku, size: variant.size, color: variant.color, quantity: cartItem.quantity, price: money(variant.priceOverride ?? variant.price), image: variant.images[0]?.url ?? product.images[0]?.url ?? '/product.webp' };
  });
};

const enforceCustomerCouponLimit = async (userId: string, coupon: { code: string; userUsageLimit?: number | null }): Promise<void> => {
  const limit = coupon.userUsageLimit ?? 1;
  const uses = await OrderModel.countDocuments({
    user: userId,
    couponCode: coupon.code,
    orderStatus: { $ne: 'cancelled' },
    paymentStatus: { $nin: ['failed', 'cancelled'] }
  });
  if (uses >= limit) throw new ApiError(400, 'Coupon usage limit reached for this customer');
};

const existingCheckoutResult = <T extends {
  paymentMode?: string | null;
  paymentProvider?: string | null;
  razorpayOrderId?: string | null;
  stripePaymentIntentId?: string | null;
  paymentAttempts?: Array<{ providerOrderId?: string | null; amount: number; status: string }>;
}>(order: T): { order: T; payment: Record<string, unknown> | null; amountToPay: number; reused: true } => {
  const providerOrderId = order.razorpayOrderId ?? order.stripePaymentIntentId;
  const attempt = [...(order.paymentAttempts ?? [])].reverse().find((candidate) => candidate.providerOrderId === providerOrderId && candidate.status === 'created');
  return {
    order,
    payment: providerOrderId ? { id: providerOrderId, amount: attempt?.amount ?? 0, currency: 'INR', provider: order.paymentProvider } : null,
    amountToPay: attempt?.amount ?? 0,
    reused: true
  };
};

const duplicateKey = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;

type MutablePaymentAttempt = { providerOrderId?: string | null; providerPaymentId?: string | null; amount: number; status: string; method?: string | null; errorDescription?: string | null };
type MutablePaymentOrder = { razorpayOrderId?: string | null; stripePaymentIntentId?: string | null; paymentAttempts: MutablePaymentAttempt[] };

const reconcilePaymentAttempt = (order: MutablePaymentOrder, paymentId: string, amount: number, status: 'authorized' | 'captured', method?: string, errorDescription?: string): boolean => {
  const providerOrderId = order.razorpayOrderId ?? order.stripePaymentIntentId;
  const attempts = order.paymentAttempts;
  const capturedIndex = attempts.findIndex((attempt) => attempt.providerOrderId === providerOrderId && attempt.providerPaymentId === paymentId);
  const placeholderIndex = attempts.findIndex((attempt) => attempt.providerOrderId === providerOrderId && !attempt.providerPaymentId);
  let target = capturedIndex >= 0 ? attempts[capturedIndex] : placeholderIndex >= 0 ? attempts[placeholderIndex] : undefined;
  let changed = false;

  // Older orders recorded `created` and `captured` as two rows for one provider
  // attempt. Fold only that empty-payment placeholder into the matching payment;
  // distinct failed/retried provider payment IDs remain separate attempts.
  if (capturedIndex >= 0 && placeholderIndex >= 0 && capturedIndex !== placeholderIndex) {
    target = attempts[placeholderIndex];
    Object.assign(target, attempts[capturedIndex]);
    attempts.splice(capturedIndex, 1);
    changed = true;
  }
  if (!target) {
    target = { providerOrderId, amount, status };
    attempts.push(target);
    changed = true;
  }
  const next = { providerOrderId, providerPaymentId: paymentId, amount, status, method, errorDescription };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) continue;
    const field = key as keyof MutablePaymentAttempt;
    if (target[field] !== value) {
      (target as Record<string, unknown>)[key] = value;
      changed = true;
    }
  }
  return changed;
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
  const settlementStartedAt = new Date();
  const staleSettlement = new Date(settlementStartedAt.getTime() - 5 * 60_000);
  const order = await OrderModel.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: { $ne: 'cancelled' },
      paymentStatus: { $nin: ['paid', 'partially_paid', 'partially_refunded', 'refunded'] },
      $or: [{ paymentSettlementStartedAt: { $exists: false } }, { paymentSettlementStartedAt: { $lt: staleSettlement } }]
    },
    { $set: { paymentSettlementStartedAt: settlementStartedAt } },
    { new: true }
  );
  if (!order) {
    const current = await OrderModel.findById(orderId);
    if (!current) throw new ApiError(404, 'Order not found');
    if (['paid', 'partially_paid', 'partially_refunded', 'refunded'].includes(current.paymentStatus)) {
      const existingAttempt = [...current.paymentAttempts].reverse().find((attempt) => attempt.providerPaymentId === paymentId || (!attempt.providerPaymentId && attempt.providerOrderId === (current.razorpayOrderId ?? current.stripePaymentIntentId)));
      if (reconcilePaymentAttempt(current as unknown as MutablePaymentOrder, paymentId, existingAttempt?.amount ?? current.amountPaid, 'captured', existingAttempt?.method ?? undefined)) await current.save();
      return current;
    }
    if (current.orderStatus === 'cancelled') {
      const matchingAttempt = [...current.paymentAttempts].reverse().find((attempt) => attempt.providerOrderId === (current.razorpayOrderId ?? current.stripePaymentIntentId));
      const capturedAmount = current.paymentMode === 'partial' ? money(matchingAttempt?.amount ?? 0) : current.total;
      if (capturedAmount <= 0 || capturedAmount > current.total) throw new ApiError(409, 'Cancelled-order payment amount could not be reconciled');
      current.amountPaid = money(Math.min(current.total, current.amountPaid + capturedAmount));
      current.amountDue = 0;
      current.razorpayPaymentId = paymentId;
      current.paymentStatus = current.paymentMode === 'partial' ? 'partially_paid' : 'paid';
      reconcilePaymentAttempt(current as unknown as MutablePaymentOrder, paymentId, capturedAmount, 'captured', method);
      reconcileCancellationRefundState(current as unknown as CancellationRefundOrder);
      current.timeline.push({ status: 'refund_required', timestamp: new Date(), note: 'Payment captured after cancellation; admin refund required' });
      current.paymentSettlementStartedAt = undefined;
      await current.save();
      return current;
    }
    throw new ApiError(409, 'Payment settlement is already in progress');
  }
  const paymentAttempt = [...order.paymentAttempts].reverse().find((attempt) => attempt.providerOrderId === order.razorpayOrderId || attempt.providerOrderId === order.stripePaymentIntentId);
  const capturedAmount = order.paymentMode === 'partial' ? money(paymentAttempt?.amount ?? 0) : order.total;
  if (capturedAmount <= 0 || capturedAmount > order.total) {
    await OrderModel.updateOne({ _id: orderId, paymentSettlementStartedAt: settlementStartedAt }, { $unset: { paymentSettlementStartedAt: 1 } });
    throw new ApiError(409, 'Payment amount could not be reconciled');
  }
  const reconcileAmounts = (): void => {
    order.amountPaid = money(Math.min(order.total, order.amountPaid + capturedAmount));
    order.amountDue = money(Math.max(0, order.total - order.amountPaid));
  };
  try {
    await reserveStock(orderId);
  } catch (error) {
    reconcileAmounts();
    order.paymentStatus = 'authorized';
    order.razorpayPaymentId = paymentId;
    reconcilePaymentAttempt(order as unknown as MutablePaymentOrder, paymentId, capturedAmount, 'authorized', method, 'Payment received; stock requires manual resolution');
    order.timeline.push({ status: 'authorized', timestamp: new Date(), note: 'Payment received; inventory review required' });
    order.paymentSettlementStartedAt = undefined;
    await order.save();
    return order;
  }
  reconcileAmounts();
  order.razorpayPaymentId = paymentId;
  order.paymentStatus = order.paymentMode === 'partial' ? 'partially_paid' : 'paid';
  order.orderStatus = 'confirmed';
  reconcilePaymentAttempt(order as unknown as MutablePaymentOrder, paymentId, capturedAmount, 'captured', method);
  order.timeline.push({ status: order.paymentStatus, timestamp: new Date(), note });
  order.paymentSettlementStartedAt = undefined;
  await order.save();
  await CartModel.deleteOne({ user: order.user });
  await notifyOrderConfirmation(orderId);
  return order;
};

export const OrderService = {
  async checkout(userId: string, input: CheckoutInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to place an order');
    const existing = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
    if (existing) return existingCheckoutResult(existing);
    const mode = input.paymentMode ?? (input.paymentMethod === 'cod' ? 'cod' : 'online');
    if (mode === 'cod' || input.paymentMethod === 'cod') return this.createCodOrder(userId, input);
    if (input.paymentMethod !== 'razorpay' && input.paymentMethod !== 'stripe') throw new ApiError(400, 'Unsupported payment method');
    if (mode === 'partial' && (!env.PARTIAL_PAYMENT_ENABLED || input.paymentMethod !== 'razorpay')) throw new ApiError(400, 'Partial payment is unavailable');
    const cart = await CartModel.findOne({ user: userId }).lean();
    if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
    const items = await priceCart(cart);
    const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const coupon = input.couponCode ? await CouponModel.findOne({ code: input.couponCode.toUpperCase(), isActive: true }) : null;
    if (coupon) await enforceCustomerCouponLimit(userId, coupon);
    const couponResult = coupon ? await calculateCouponDiscount(coupon, items) : null;
    const discount = money(couponResult?.discount ?? 0);
    const shippingMethod = input.shippingMethod ?? 'standard';
    const shipping = calculateShippingRate(subtotal - discount, Boolean(couponResult?.freeShipping), shippingMethod, await shippingSettings());
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = money(subtotal - discount + shipping + tax);
    if (mode === 'partial' && total < env.MIN_PARTIAL_PAYMENT_ORDER_VALUE) throw new ApiError(400, 'Order value is below the partial-payment minimum');
    const advance = mode === 'partial' ? money(Math.min(total, env.PARTIAL_PAYMENT_FIXED_AMOUNT ?? total * ((env.PARTIAL_PAYMENT_PERCENTAGE ?? 0) / 100))) : total;
    if (advance <= 0) throw new ApiError(400, 'Invalid partial-payment configuration');
    let order;
    try {
      order = await OrderModel.create({ orderNumber: orderNumber(), checkoutIdempotencyKey: input.idempotencyKey, user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: input.paymentMethod, paymentMode: mode, shippingMethod, paymentProvider: input.paymentMethod, subtotal, tax, shipping, discount, codFee: 0, total, amountPaid: 0, amountDue: total, couponCode: coupon?.code, timeline: [{ status: 'pending', timestamp: new Date(), note: coupon ? `Order created with coupon ${coupon.code}` : 'Order created' }] });
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      const duplicate = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
      if (!duplicate) throw error;
      return existingCheckoutResult(duplicate);
    }
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
    const existing = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
    if (existing) return existingCheckoutResult(existing);
    const cart = await CartModel.findOne({ user: userId }).lean();
    if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
    const items = await priceCart(cart);
    const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const coupon = input.couponCode ? await CouponModel.findOne({ code: input.couponCode.toUpperCase(), isActive: true }) : null;
    if (coupon) await enforceCustomerCouponLimit(userId, coupon);
    const couponResult = coupon ? await calculateCouponDiscount(coupon, items) : null;
    const discount = money(couponResult?.discount ?? 0);
    const shippingMethod = input.shippingMethod ?? 'standard';
    const shipping = calculateShippingRate(subtotal - discount, Boolean(couponResult?.freeShipping), shippingMethod, await shippingSettings());
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = money(subtotal - discount + shipping + tax + env.COD_FEE);
    if (total > env.MAX_COD_ORDER_VALUE) throw new ApiError(400, 'Cash on delivery is unavailable for this order value');
    let order;
    try {
      order = await OrderModel.create({ orderNumber: orderNumber(), checkoutIdempotencyKey: input.idempotencyKey, user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: 'cod', paymentMode: 'cod', shippingMethod, paymentProvider: 'cod', paymentStatus: 'cod_pending', orderStatus: 'placed', subtotal, tax, shipping, discount, codFee: env.COD_FEE, total, amountPaid: 0, amountDue: total, couponCode: coupon?.code, timeline: [{ status: 'placed', timestamp: new Date(), note: 'COD order placed; payment due on delivery' }] });
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      const duplicate = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
      if (!duplicate) throw error;
      return existingCheckoutResult(duplicate);
    }
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
    try { await PaymentWebhookEventModel.create({ provider: 'razorpay', eventId, eventType, payload: webhookAuditPayload(payload) }); } catch (error: unknown) { if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) return false; throw error; }
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
    const statusChanged = refund.status !== status;
    refund.status = status;
    const refunded = order.refunds.filter((candidate) => candidate.status === 'processed').reduce((sum, candidate) => sum + candidate.amount, 0);
    order.refundAmount = refunded;
    if (status === 'processed') order.paymentStatus = refunded >= order.amountPaid ? 'refunded' : 'partially_refunded';
    reconcileCancellationRefundState(order as unknown as CancellationRefundOrder);
    if (statusChanged) order.timeline.push({ status: status === 'processed' ? order.paymentStatus : 'refund_failed', timestamp: new Date(), note: `Razorpay refund ${status}` });
    await order.save();
  },

  async refund(orderId: string, amount: number, reason: string | undefined, adminId: string, idempotencyKey: string): Promise<unknown> {
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Refund amount must be positive');
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    const existingRequest = order.refunds.find((candidate) => candidate.idempotencyKey === idempotencyKey);
    if (existingRequest) {
      if (existingRequest.amount !== amount || (existingRequest.reason ?? '') !== (reason ?? '')) throw new ApiError(409, 'Refund idempotency key was already used with different details');
      return { id: existingRequest.providerRefundId, amount: existingRequest.amount, status: existingRequest.status, reused: true };
    }
    if (order.paymentProvider !== 'razorpay' || !order.razorpayPaymentId) throw new ApiError(400, 'Only captured online payments can be refunded through Razorpay');
    const alreadyRefunded = order.refunds.filter((refund) => ['created', 'pending', 'processed'].includes(refund.status)).reduce((sum, refund) => sum + refund.amount, 0);
    if (amount > order.amountPaid - alreadyRefunded) throw new ApiError(400, 'Refund exceeds amount paid');
    const refund = await PaymentService.refund('razorpay', order.razorpayPaymentId, amount, idempotencyKey, { orderId, reason: reason ?? '' });
    if (order.refunds.some((existing) => existing.providerRefundId === refund.id)) return refund;
    order.refunds.push({ providerRefundId: refund.id, idempotencyKey, amount, status: refund.status, reason, requestedBy: new Types.ObjectId(adminId) });
    if (refund.status === 'processed') {
      order.refundAmount = money(order.refunds.filter((candidate) => candidate.status === 'processed').reduce((sum, candidate) => sum + candidate.amount, 0));
      order.paymentStatus = order.refundAmount >= order.amountPaid ? 'refunded' : 'partially_refunded';
      order.timeline.push({ status: order.paymentStatus, timestamp: new Date(), note: reason ? `Razorpay refund processed: ${reason}` : 'Razorpay refund processed' });
    } else {
      order.timeline.push({ status: 'refund_pending', timestamp: new Date(), note: reason ? `Refund requested: ${reason}` : 'Refund requested' });
    }
    reconcileCancellationRefundState(order as unknown as CancellationRefundOrder);
    await order.save();
    return refund;
  },

  async syncLatestRefund(orderId: string): Promise<unknown> {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentProvider !== 'razorpay' || !order.razorpayPaymentId) throw new ApiError(400, 'Only Razorpay refunds can be synchronized');
    const latest = [...order.refunds].reverse().find((refund) => Boolean(refund.providerRefundId));
    if (!latest?.providerRefundId) throw new ApiError(400, 'No provider refund is available to synchronize');
    const providerRefund = await PaymentService.fetchRazorpayRefund(latest.providerRefundId);
    const statusChanged = latest.status !== providerRefund.status;
    latest.status = providerRefund.status;
    const processed = money(order.refunds.filter((refund) => refund.status === 'processed').reduce((sum, refund) => sum + refund.amount, 0));
    order.refundAmount = processed;
    if (processed >= order.amountPaid && order.amountPaid > 0) order.paymentStatus = 'refunded';
    else if (processed > 0) order.paymentStatus = 'partially_refunded';
    reconcileCancellationRefundState(order as unknown as CancellationRefundOrder);
    if (statusChanged) order.timeline.push({ status: providerRefund.status === 'processed' ? order.paymentStatus : `refund_${providerRefund.status}`, timestamp: new Date(), note: `Razorpay refund synchronized: ${providerRefund.status}` });
    await order.save();
    return order;
  },

  async markCollectionPaid(id: string, adminId: string, partial: boolean): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (partial ? order.paymentMode !== 'partial' : order.paymentMode !== 'cod') throw new ApiError(400, 'Payment mode does not match this action');
    if (order.orderStatus === 'cancelled') throw new ApiError(409, 'Payment collection cannot be recorded for a cancelled order');
    if (order.paymentStatus === 'paid' && order.amountDue === 0) return order;
    order.amountPaid = order.total;
    order.amountDue = 0;
    order.paymentStatus = 'paid';
    order.paymentProvider = partial ? 'manual' : 'cod';
    order.timeline.push({ status: 'paid', timestamp: new Date(), note: partial ? `Remaining amount collected by admin ${adminId}` : `COD collected by admin ${adminId}` });
    await order.save();
    return order;
  },

  async cancelByCustomer(id: string, userId: string, input: CustomerCancellationInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to cancel an order');
    const reason = customerCancellationReasons[input.reasonCode];
    const details = input.details?.trim();
    if (!reason) throw new ApiError(400, 'Select a valid cancellation reason');
    if (input.reasonCode === 'other' && (!details || details.length < 10)) throw new ApiError(400, 'Please explain why you are cancelling this order');
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.user || String(order.user) !== userId) throw new ApiError(403, 'Order access denied');
    if (order.orderStatus === 'cancelled') return order;
    if (!customerCancellableStatuses.has(order.orderStatus)) throw new ApiError(409, 'This order can no longer be cancelled online');
    const cancelledAt = new Date();
    const cancellation = { requestedBy: 'customer', reasonCode: input.reasonCode, reason, details, requestedAt: cancelledAt, cancelledAt, refundStatus: order.amountPaid > 0 ? 'required' : 'not_required', refundAmount: order.refundAmount ?? 0 };
    reconcileCancellationRefundState({ amountPaid: order.amountPaid, refunds: order.refunds, cancellation } as CancellationRefundOrder);
    const previous = await OrderModel.findOneAndUpdate(
      { _id: id, user: userId, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, amountPaid: order.amountPaid, paymentSettlementStartedAt: { $exists: false } },
      { $set: { orderStatus: 'cancelled', paymentStatus: order.amountPaid > 0 ? order.paymentStatus : 'cancelled', amountDue: 0, stockReserved: false, cancellation }, $push: { timeline: { status: 'cancelled', timestamp: cancelledAt, note: `Customer cancelled: ${reason}${details ? ` — ${details}` : ''}` } } },
      { new: false }
    );
    if (!previous) {
      const current = await OrderModel.findById(id);
      if (current?.orderStatus === 'cancelled') return current;
      if (current?.paymentSettlementStartedAt) throw new ApiError(409, 'Payment is being finalized; wait a moment before cancelling');
      throw new ApiError(409, 'Order status changed; refresh and try again');
    }
    try {
      await restoreStock(previous as never);
    } catch (error) {
      logger.error('Cancelled order stock could not be restored automatically', { orderId: id });
      await OrderModel.updateOne({ _id: id }, { $push: { timeline: { status: 'inventory_review', timestamp: new Date(), note: 'Cancellation completed; inventory restoration requires admin review' } } });
    }
    return OrderModel.findById(id);
  },

  async cancel(id: string, note?: string): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus === 'cancelled') return order;
    const cancelledAt = new Date();
    const details = note?.trim();
    const cancellation = { requestedBy: 'admin', reasonCode: 'admin_cancelled', reason: 'Cancelled by Cruisin', details, requestedAt: cancelledAt, cancelledAt, refundStatus: order.amountPaid > 0 ? 'required' : 'not_required', refundAmount: order.refundAmount ?? 0 };
    reconcileCancellationRefundState({ amountPaid: order.amountPaid, refunds: order.refunds, cancellation } as CancellationRefundOrder);
    const previous = await OrderModel.findOneAndUpdate(
      { _id: id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, amountPaid: order.amountPaid, paymentSettlementStartedAt: { $exists: false } },
      { $set: { orderStatus: 'cancelled', paymentStatus: order.amountPaid > 0 ? order.paymentStatus : 'cancelled', amountDue: 0, stockReserved: false, cancellation }, $push: { timeline: { status: 'cancelled', timestamp: cancelledAt, note: details || 'Order cancelled by Cruisin' } } },
      { new: false }
    );
    if (!previous) {
      const current = await OrderModel.findById(id);
      if (current?.orderStatus === 'cancelled') return current;
      if (current?.paymentSettlementStartedAt) throw new ApiError(409, 'Payment is being finalized; wait a moment before cancelling');
      throw new ApiError(409, 'Order status changed; refresh and try again');
    }
    try {
      await restoreStock(previous as never);
    } catch (error) {
      logger.error('Admin-cancelled order stock could not be restored automatically', { orderId: id });
      await OrderModel.updateOne({ _id: id }, { $push: { timeline: { status: 'inventory_review', timestamp: new Date(), note: 'Cancellation completed; inventory restoration requires admin review' } } });
    }
    return OrderModel.findById(id);
  },

  async list(userId: string): Promise<unknown[]> { const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean(); return orders.map(normalizeOrderRead); },
  async adminList(): Promise<unknown[]> { const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(200).lean(); return orders.map(normalizeOrderRead); },
  async adminById(id: string): Promise<unknown> { const order = await OrderModel.findById(id).lean(); if (!order) throw new ApiError(404, 'Order not found'); return normalizeOrderRead(order); },
  async byId(id: string, user: { userId: string; role: string } | undefined): Promise<unknown> {
    const order = await OrderModel.findById(id).lean();
    if (!order) throw new ApiError(404, 'Order not found');
    if (!user || !order.user || String(order.user) !== user.userId) throw new ApiError(403, 'Order access denied');
    return normalizeOrderRead(order);
  },
  async updateStatus(id: string, input: { status: string; note?: string; trackingNumber?: string }): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus === input.status) return order;
    if (!(orderStatusTransitions[order.orderStatus] ?? []).includes(input.status)) {
      throw new ApiError(409, `Order cannot move from ${order.orderStatus} to ${input.status}`);
    }
    if (input.status === 'cancelled') return this.cancel(id, input.note);
    const updated = await OrderModel.findOneAndUpdate(
      { _id: id, orderStatus: order.orderStatus },
      { orderStatus: input.status, trackingNumber: input.trackingNumber, $push: { timeline: { status: input.status, timestamp: new Date(), note: input.note } } },
      { new: true }
    );
    if (!updated) throw new ApiError(409, 'Order status changed; refresh and try again');
    return updated;
  }
};
