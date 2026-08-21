import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { env } from '../config/env.js';
import { logisticsConfig } from '../config/logistics.js';
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentWebhookEventModel } from '../models/payment-webhook-event.model.js';
import { ProductModel, type ProductDocument } from '../models/product.model.js';
import { SiteSettingsModel } from '../models/site-settings.model.js';
import { UserModel } from '../models/user.model.js';
import type { CheckoutPaymentMode, PaymentMethod } from '../types/payment.types.js';
import { ApiError } from '../utils/api-error.js';
import { calculateCouponDiscount } from '../utils/coupon-discount.js';
import { calculateBundleDiscount, type BundleDiscountProduct } from '../utils/bundle-discount.js';
import { sendEmail } from '../utils/send-email.js';
import { logger } from '../utils/logger.js';
import { withMongoTransaction } from '../utils/mongo-transaction.js';
import { recordPerformanceStage } from '../utils/request-performance.js';
import { calculateShippingRate, type ShippingMethod } from '../utils/shipping-rate.js';
import { PaymentService } from './payment.service.js';
import { AddressBookService } from './address-book.service.js';
import { LogisticsJobService } from './logistics/logistics-job.service.js';
import { shouldAutoCreateProviderOrder } from './logistics/logistics-automation.service.js';
import { LogisticsQuoteService, type PricedCartLine } from './logistics/logistics-quote.service.js';
import { LogisticsService } from './logistics/logistics.service.js';
import { assertCouponCustomerEligible, confirmCouponRedemption, releaseCouponRedemption, reserveCouponRedemption } from './coupon-redemption.service.js';

type AddressInput = Record<string, unknown>;
type CheckoutInput = { shippingAddress: AddressInput; billingAddress: AddressInput; paymentMethod: PaymentMethod; paymentMode?: CheckoutPaymentMode; shippingMethod?: ShippingMethod; logisticsQuoteId?: string; couponCode?: string; expectedCartVersion?: number; idempotencyKey: string; metaEventId?: string };

const enforceCartVersion = (cart: { version?: number | null }, expectedVersion?: number): void => {
  if (expectedVersion !== undefined && (cart.version ?? 0) !== expectedVersion) throw new ApiError(409, 'Your bag changed. Review it before placing the order.');
};

const idString = (value: unknown): string => value instanceof Types.ObjectId ? value.toString() : typeof value === 'string' ? value : value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : '';
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const onlineReservationTtlMs = 15 * 60_000;
const checkoutRequestHash = (input: CheckoutInput): string => crypto.createHash('sha256').update(JSON.stringify({
  shippingAddress: input.shippingAddress,
  billingAddress: input.billingAddress,
  paymentMethod: input.paymentMethod,
  paymentMode: input.paymentMode,
  shippingMethod: input.shippingMethod,
  logisticsQuoteId: input.logisticsQuoteId,
  couponCode: input.couponCode?.toUpperCase(),
  expectedCartVersion: input.expectedCartVersion,
  metaEventId: input.metaEventId
})).digest('hex');
const shippingSettings = async (): Promise<{ standardShippingRate?: number; expressShippingRate?: number; freeStandardShippingThreshold?: number; codCheckoutEnabled?: boolean; codFee?: number }> => {
  const settings = await SiteSettingsModel.findOne({ singletonKey: 'global' }).select('standardShippingRate expressShippingRate freeStandardShippingThreshold codCheckoutEnabled codFee').lean();
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
  await sendEmail({ to: user.email, subject: 'Cruisin order confirmed', text: `Your Cruisin order ${order.orderNumber ?? orderId} is confirmed.`, html: `<p>Your Cruisin order <strong>${order.orderNumber ?? orderId}</strong> is confirmed.</p>` });
};

const prepareFulfillment = async (orderId: string): Promise<void> => {
  if (!logisticsConfig.enabled) return;
  try {
    await LogisticsService.ensureDraftForOrder(orderId);
    const order = await OrderModel.findById(orderId).select('paymentMode').lean();
    if (shouldAutoCreateProviderOrder(order?.paymentMode)) {
      await LogisticsJobService.enqueue('create_order', { orderId }, `create-order:${orderId}`);
    }
  } catch (error) {
    logger.error('Order fulfillment could not be prepared', { orderId, error });
    await OrderModel.updateOne(
      { _id: orderId },
      {
        $set: { fulfillmentStatus: 'logistics_error' },
        $push: { timeline: { status: 'logistics_error', timestamp: new Date(), note: 'Payment is safe; shipping setup requires admin review' } }
      }
    );
    throw error;
  }
};

const sessionOptions = (session?: ClientSession): { session?: ClientSession } => session ? { session } : {};

const reserveInventory = async (
  items: Array<{ product: unknown; variant: unknown; quantity: number; price: number; sku: string }>,
  session?: ClientSession
): Promise<void> => {
  const result = await ProductModel.bulkWrite(items.map((item) => ({
    updateOne: {
      filter: {
        _id: item.product,
        status: 'published',
        visibility: 'visible',
        isActive: true,
        isArchived: { $ne: true },
        variants: {
          $elemMatch: {
            _id: item.variant,
            enabled: { $ne: false },
            stock: { $gte: item.quantity },
            $or: [
              { priceOverride: item.price },
              { priceOverride: { $exists: false }, price: item.price },
              { priceOverride: null, price: item.price }
            ]
          }
        }
      },
      update: { $inc: { 'variants.$.stock': -item.quantity } }
    }
  })), { ordered: true, ...sessionOptions(session) });
  if (result.modifiedCount !== items.length) {
    throw new ApiError(409, 'Stock or price changed for an item in your bag; review your bag');
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

const restoreStock = async (order: { stockReserved?: boolean; items: Array<{ product: Types.ObjectId; variant: Types.ObjectId; quantity: number }> }, session?: ClientSession): Promise<void> => {
  if (!order.stockReserved) return;
  const restored = await Promise.all(order.items.map((item) => ProductModel.updateOne({ _id: item.product, 'variants._id': item.variant }, { $inc: { 'variants.$.stock': item.quantity } }, sessionOptions(session))));
  if (restored.some((result) => result.modifiedCount !== 1)) {
    throw new ApiError(409, 'Reserved inventory could not be restored automatically');
  }
};

type PricedProduct = ProductDocument & { _id: Types.ObjectId };

const createPricedItems = (cartItems: Array<{ product: unknown; variant: unknown; quantity: number }>, products: PricedProduct[]) => {
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items = cartItems.map((cartItem) => {
    const productId = idString(cartItem.product);
    const variantId = idString(cartItem.variant);
    const product = byId.get(productId);
    if (!product || product.status !== 'published' || product.visibility !== 'visible' || !product.isActive || product.isArchived) throw new ApiError(409, 'A product in your bag is no longer available');
    const variant = product.variants.find((candidate) => String(candidate._id) === variantId);
    if (!variant || variant.enabled === false || variant.stock < cartItem.quantity) throw new ApiError(409, `Selected variant is unavailable for ${product.title}`);
    const unitCostBreakdown = {
      manufacturing: money(product.costBreakdown?.manufacturing ?? product.costPrice ?? 0),
      packaging: money(product.costBreakdown?.packaging ?? 0),
      marketing: money(product.costBreakdown?.marketing ?? 0),
      handling: money(product.costBreakdown?.handling ?? 0),
      other: money(product.costBreakdown?.other ?? 0)
    };
    const unitCostTotal = money(Object.values(unitCostBreakdown).reduce((sum, value) => sum + value, 0));
    return { product: new Types.ObjectId(productId), variant: new Types.ObjectId(variantId), title: product.title, sku: variant.sku, hsn: product.hsnCode ?? '', size: variant.size, color: variant.color, quantity: cartItem.quantity, price: money(variant.priceOverride ?? variant.price), unitCostBreakdown, unitCostTotal, image: variant.images[0]?.url ?? product.images[0]?.url ?? '/product.webp' };
  });
  const bundleProducts: BundleDiscountProduct[] = products.map((product) => ({
    id: String(product._id),
    recommendedProductIds: (product.recommendedProducts ?? []).map((id) => idString(id)).filter(Boolean),
    strategy: product.completeTheFit?.strategy,
    bundleDiscount: product.completeTheFit?.bundleDiscount ?? undefined
  }));
  const quoteLines: PricedCartLine[] = cartItems.map((cartItem) => {
    const productId = idString(cartItem.product);
    const variantId = idString(cartItem.variant);
    const product = byId.get(productId);
    const variant = product?.variants.find((candidate) => String(candidate._id) === variantId);
    if (!product || !variant) throw new ApiError(409, 'A product in your bag is no longer available');
    return {
      productId,
      variantId,
      quantity: cartItem.quantity,
      price: money(variant.priceOverride ?? variant.price),
      packageLine: { product, variant, quantity: cartItem.quantity }
    };
  });
  return { items, bundleProducts, products, quoteLines };
};

const enforceCustomerCouponLimit = async (userId: string, coupon: { code: string; userUsageLimit?: number | null }): Promise<void> => {
  await assertCouponCustomerEligible(userId, coupon as never);
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

type ExistingCheckoutOrder = Parameters<typeof existingCheckoutResult>[0] & {
  checkoutRequestHash?: string | null;
  paymentStatus?: string | null;
};

const resolveExistingCheckout = async (
  userId: string,
  idempotencyKey: string,
  requestHash: string,
  initial: ExistingCheckoutOrder
): Promise<ReturnType<typeof existingCheckoutResult>> => {
  validateExistingAttempt(initial, requestHash);
  if (initial.paymentMode !== 'cod' && ['failed', 'cancelled'].includes(initial.paymentStatus ?? '')) {
    throw terminalCheckoutAttemptError('The previous payment session did not start. Retry checkout to create a new attempt.');
  }
  if (initial.paymentMode === 'cod' || initial.razorpayOrderId || initial.stripePaymentIntentId) return existingCheckoutResult(initial);

  // A duplicate request can observe the committed local order while the first
  // request is still waiting for Razorpay/Stripe. Reuse that in-flight attempt
  // instead of creating another provider order or returning a broken null
  // payment response. The bounded poll is used only for duplicate submissions.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: idempotencyKey });
    if (!current) break;
    validateExistingAttempt(current, requestHash);
    if (current.razorpayOrderId || current.stripePaymentIntentId) return existingCheckoutResult(current);
    if (['failed', 'cancelled'].includes(current.paymentStatus)) {
      throw terminalCheckoutAttemptError('The previous payment session did not start. Retry checkout to create a new attempt.');
    }
  }
  throw new ApiError(409, 'Your secure payment session is still being prepared. Retry shortly with the same checkout attempt.');
};

const duplicateKey = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
const terminalCheckoutAttemptError = (message: string, statusCode = 409): ApiError => new ApiError(
  statusCode,
  message,
  [],
  true,
  { retryWithNewAttempt: true }
);

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
const priceCart = async (cart: { _id: unknown; version?: number | null; items: Array<{ product: unknown; variant: unknown; quantity: number }> }) => {
  const productIds = [...new Set(cart.items.map((item) => idString(item.product)).filter((id) => Types.ObjectId.isValid(id)))];
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean() as unknown as PricedProduct[];
  const existingIds = new Set(products.map((product) => String(product._id)));
  const removedProductIds = productIds.filter((id) => !existingIds.has(id));
  if (removedProductIds.length > 0) {
    await CartModel.updateOne(
      { _id: cart._id, ...cartVersionFilter(cart.version ?? 0) },
      {
        $pull: { items: { product: { $in: removedProductIds.map((id) => new Types.ObjectId(id)) } } },
        $set: { couponDiscount: 0, couponFreeShipping: false, couponEligibleSubtotal: 0 },
        $unset: { couponCode: 1 },
        $inc: { version: 1 }
      }
    );
    throw new ApiError(409, 'Some items are no longer available and were removed from your bag');
  }
  return createPricedItems(cart.items, products);
};

const rememberCheckoutAddress = async (userId: string, address: AddressInput): Promise<void> => {
  try {
    await AddressBookService.saveCheckoutAddress(userId, address);
  } catch (error) {
    logger.error('Checkout address could not be added to the customer address book', { userId, error });
  }
};

const synchronizeCheckoutCustomer = async (userId: string, address: AddressInput): Promise<void> => {
  const checkoutName = typeof address.fullName === 'string' ? address.fullName.trim().replace(/\s+/g, ' ') : '';
  if (!checkoutName) return;
  try {
    await UserModel.updateOne(
      { _id: userId, $or: [{ name: 'Cruisin Member' }, { name: /^\s*$/ }] },
      { $set: { name: checkoutName } },
      { runValidators: true }
    );
  } catch (error) {
    logger.error('Checkout profile name could not be synchronized', { userId, error });
  }
};

const rememberCheckoutCustomer = async (userId: string, address: AddressInput): Promise<void> => {
  await Promise.all([rememberCheckoutAddress(userId, address), synchronizeCheckoutCustomer(userId, address)]);
};

const prepareCheckout = async (userId: string, input: CheckoutInput, deliveryPaymentMode: 'prepaid' | 'cod') => {
  const cart = await recordPerformanceStage('cart.load', () => CartModel.findOne({ user: userId }).lean());
  if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
  enforceCartVersion(cart, input.expectedCartVersion);
  const requestedCouponCode = (input.couponCode ?? cart.couponCode)?.toUpperCase();
  const [pricedCart, coupon, settings] = await Promise.all([
    recordPerformanceStage('product.load', () => priceCart(cart)),
    requestedCouponCode ? recordPerformanceStage('coupon.load', () => CouponModel.findOne({ code: requestedCouponCode, isActive: true })) : Promise.resolve(null),
    recordPerformanceStage('settings.load', () => shippingSettings())
  ]);
  if (requestedCouponCode && !coupon) throw new ApiError(409, 'Coupon is no longer available');
  const items = pricedCart.items;
  const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const couponResult = coupon ? await Promise.all([
    recordPerformanceStage('coupon.calculate', () => calculateCouponDiscount(coupon, items, pricedCart.products)),
    recordPerformanceStage('coupon.usage', () => enforceCustomerCouponLimit(userId, coupon))
  ]).then(([result]) => result) : null;
  const couponDiscount = money(couponResult?.discount ?? 0);
  const bundleSaving = recordPerformanceStage('bundle.calculate', () => calculateBundleDiscount(
    items.map((item) => ({ productId: String(item.product), quantity: item.quantity })),
    pricedCart.bundleProducts
  ));
  const bundleDiscount = money(bundleSaving.amount);
  const discount = money(Math.min(subtotal, couponDiscount + bundleDiscount));
  const requestedShippingMethod = input.shippingMethod ?? 'standard';
  const logisticsQuote = logisticsConfig.enabled ? await recordPerformanceStage('delivery.validate', () => LogisticsQuoteService.validate(userId, {
    quoteId: input.logisticsQuoteId,
    shippingMethod: requestedShippingMethod,
    paymentMode: deliveryPaymentMode,
    deliveryPostcode: String(input.shippingAddress.postalCode ?? ''),
    freeShipping: Boolean(couponResult?.freeShipping),
    authoritativeCart: { version: cart.version ?? 0, lines: pricedCart.quoteLines }
  })) : null;
  const shippingMethod = logisticsQuote?.shippingMethod ?? requestedShippingMethod;
  const shipping = logisticsQuote?.shippingCharge ?? (logisticsConfig.customerFreeShipping
    ? 0
    : calculateShippingRate(subtotal - discount, Boolean(couponResult?.freeShipping), shippingMethod, settings));
  return {
    cart,
    pricedCart,
    items,
    coupon,
    couponResult,
    settings,
    subtotal,
    couponDiscount,
    bundleSaving,
    bundleDiscount,
    discount,
    logisticsQuote,
    shippingMethod,
    shipping
  };
};

const cartVersionFilter = (version: number): Record<string, unknown> => version === 0
  ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
  : { version };

const assertCartUnchangedInTransaction = async (cart: { _id: unknown; version?: number | null }, session?: ClientSession): Promise<void> => {
  if (!session) return;
  const query = CartModel.findOne({ _id: cart._id, ...cartVersionFilter(cart.version ?? 0) }).select('_id');
  query.session(session);
  if (!await query.lean()) throw new ApiError(409, 'Your bag changed while checkout was being prepared');
};

const createOrderRecord = async (data: Record<string, unknown>, session?: ClientSession) => {
  if (!session) return await OrderModel.create(data);
  const created = await OrderModel.create([data], { session });
  if (!created[0]) throw new ApiError(409, 'Order could not be created');
  return created[0];
};

const validateExistingAttempt = (order: { checkoutRequestHash?: string | null }, requestHash: string): void => {
  if (order.checkoutRequestHash && order.checkoutRequestHash !== requestHash) {
    throw new ApiError(409, 'This checkout attempt key was already used for different order details');
  }
};

const releaseActiveReservation = async (orderId: string, outcome: 'failed' | 'cancelled', note: string, providerOrderId?: string): Promise<unknown | null> => withMongoTransaction(async (session) => {
  const query = OrderModel.findOne({ _id: orderId, stockReserved: true, amountPaid: 0, paymentStatus: { $in: ['pending', 'failed'] }, paymentSettlementStartedAt: { $exists: false } });
  if (session) query.session(session);
  const order = await query;
  if (!order) {
    const current = OrderModel.findById(orderId);
    if (session) current.session(session);
    return await current;
  }
  await restoreStock(order as never, session);
  await releaseCouponRedemption(orderId, session);
  if (order.logisticsQuoteId) await LogisticsQuoteService.release(order.logisticsQuoteId, session);
  const cancellation = outcome === 'cancelled' ? { requestedBy: 'customer', reasonCode: 'payment_cancelled', reason: 'Payment cancelled at checkout', requestedAt: new Date(), cancelledAt: new Date(), refundStatus: 'not_required', refundAmount: 0 } : undefined;
  const paymentAttemptUpdate = providerOrderId ? { 'paymentAttempts.$[attempt].status': outcome } : {};
  return await OrderModel.findOneAndUpdate(
    { _id: orderId, stockReserved: true, amountPaid: 0, paymentStatus: { $in: ['pending', 'failed'] }, paymentSettlementStartedAt: { $exists: false } },
    {
      $set: {
        stockReserved: false,
        stockReservationReleasedAt: new Date(),
        paymentStatus: outcome,
        ...paymentAttemptUpdate,
        ...(outcome === 'cancelled' ? { orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', amountDue: 0, cancellation } : {})
      },
      $unset: { stockReservationExpiresAt: 1 },
      $push: { timeline: { status: outcome === 'cancelled' ? 'payment_cancelled' : 'failed', timestamp: new Date(), note } }
    },
    { new: true, ...(providerOrderId ? { arrayFilters: [{ 'attempt.providerOrderId': providerOrderId, 'attempt.status': 'created' }] } : {}), ...sessionOptions(session) }
  );
});

const cancelOrderWithCompensation = async (input: {
  orderId: string;
  filter: Record<string, unknown>;
  paymentStatus: string;
  cancellation: Record<string, unknown>;
  timelineNote: string;
}): Promise<unknown | null> => withMongoTransaction(async (session) => {
  const previous = await OrderModel.findOneAndUpdate(
    { _id: input.orderId, ...input.filter, paymentSettlementStartedAt: { $exists: false } },
    {
      $set: {
        orderStatus: 'cancelled',
        paymentStatus: input.paymentStatus,
        fulfillmentStatus: 'cancelled',
        amountDue: 0,
        stockReserved: false,
        cancellation: input.cancellation
      },
      $unset: { stockReservationExpiresAt: 1 },
      $push: { timeline: { status: 'cancelled', timestamp: new Date(), note: input.timelineNote } }
    },
    { new: false, ...sessionOptions(session) }
  );
  if (!previous) return null;
  await restoreStock(previous as never, session);
  await releaseCouponRedemption(input.orderId, session);
  if (previous.logisticsQuoteId) await LogisticsQuoteService.release(previous.logisticsQuoteId, session);
  const current = OrderModel.findById(input.orderId);
  if (session) current.session(session);
  return await current;
});

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
  order.stockReservationExpiresAt = undefined;
  await withMongoTransaction(async (session) => {
    await confirmCouponRedemption(orderId, session);
    if (session) order.$session(session);
    await order.save(sessionOptions(session));
    const cartFilter: Record<string, unknown> = { user: order.user };
    if (typeof order.checkoutCartVersion === 'number') Object.assign(cartFilter, cartVersionFilter(order.checkoutCartVersion));
    await CartModel.deleteOne(cartFilter, sessionOptions(session));
    await LogisticsJobService.enqueue('order_created', { orderId }, `order-created:${orderId}`, 8, { session });
  });
  return order;
};

export const OrderService = {
  async processOrderCreatedOutbox(orderId: string): Promise<void> {
    const order = await OrderModel.findById(orderId).select('user shippingAddress confirmationEmailSentAt fulfillmentPreparedAt customerSnapshotSynchronizedAt paymentStatus orderStatus').lean();
    if (!order) return;
    if (!order.fulfillmentPreparedAt) {
      await prepareFulfillment(orderId);
      await OrderModel.updateOne({ _id: orderId, fulfillmentPreparedAt: { $exists: false } }, { $set: { fulfillmentPreparedAt: new Date() } });
    }
    if (!order.confirmationEmailSentAt) {
      await notifyOrderConfirmation(orderId);
      await OrderModel.updateOne({ _id: orderId, confirmationEmailSentAt: { $exists: false } }, { $set: { confirmationEmailSentAt: new Date() } });
    }
    if (!order.customerSnapshotSynchronizedAt && order.user && order.shippingAddress) {
      await rememberCheckoutCustomer(String(order.user), order.shippingAddress as AddressInput);
      await OrderModel.updateOne(
        { _id: orderId, customerSnapshotSynchronizedAt: { $exists: false } },
        { $set: { customerSnapshotSynchronizedAt: new Date() } }
      );
    }
  },

  async releaseExpiredReservation(orderId: string): Promise<void> {
    await withMongoTransaction(async (session) => {
      const query = OrderModel.findOne({
        _id: orderId,
        stockReserved: true,
        stockReservationExpiresAt: { $lte: new Date() },
        paymentStatus: { $in: ['pending', 'failed'] },
        amountPaid: 0,
        paymentSettlementStartedAt: { $exists: false }
      });
      if (session) query.session(session);
      const order = await query;
      if (!order) return;
      await restoreStock(order as never, session);
      await releaseCouponRedemption(orderId, session);
      if (order.logisticsQuoteId) await LogisticsQuoteService.release(order.logisticsQuoteId, session);
      await OrderModel.updateOne(
        {
          _id: orderId,
          stockReserved: true,
          amountPaid: 0,
          paymentSettlementStartedAt: { $exists: false }
        },
        {
          $set: { stockReserved: false, stockReservationReleasedAt: new Date(), paymentStatus: 'cancelled', orderStatus: 'cancelled', amountDue: 0 },
          $unset: { stockReservationExpiresAt: 1 },
          $push: { timeline: { status: 'reservation_expired', timestamp: new Date(), note: 'Unpaid inventory reservation expired and was released' } }
        },
        sessionOptions(session)
      );
    });
  },

  async checkout(userId: string, input: CheckoutInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to place an order');
    const mode = input.paymentMode ?? (input.paymentMethod === 'cod' ? 'cod' : 'online');
    if (mode === 'cod' || input.paymentMethod === 'cod') return this.createCodOrder(userId, input);
    const requestHash = checkoutRequestHash(input);
    const existing = await recordPerformanceStage('idempotency.load', () => OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey }));
    if (existing) {
      return await resolveExistingCheckout(userId, input.idempotencyKey, requestHash, existing);
    }
    if (input.paymentMethod !== 'razorpay' && input.paymentMethod !== 'stripe') throw new ApiError(400, 'Unsupported payment method');
    if (mode === 'partial' && (!env.PARTIAL_PAYMENT_ENABLED || input.paymentMethod !== 'razorpay')) throw new ApiError(400, 'Partial payment is unavailable');
    const prepared = await prepareCheckout(userId, input, 'prepaid');
    const { cart, items, coupon, subtotal, couponDiscount, bundleSaving, bundleDiscount, discount, logisticsQuote, shippingMethod, shipping } = prepared;
    const tax = 0;
    const total = money(subtotal - discount + shipping + tax);
    if (mode === 'partial' && total < env.MIN_PARTIAL_PAYMENT_ORDER_VALUE) throw new ApiError(400, 'Order value is below the partial-payment minimum');
    const advance = mode === 'partial' ? money(Math.min(total, env.PARTIAL_PAYMENT_FIXED_AMOUNT ?? total * ((env.PARTIAL_PAYMENT_PERCENTAGE ?? 0) / 100))) : total;
    if (advance <= 0) throw new ApiError(400, 'Invalid partial-payment configuration');
    const orderId = new Types.ObjectId();
    const reservationExpiresAt = new Date(Date.now() + onlineReservationTtlMs);
    let order;
    try {
      order = await recordPerformanceStage('order.transaction', () => withMongoTransaction(async (session) => {
        await assertCartUnchangedInTransaction(cart, session);
        await recordPerformanceStage('stock.reserve', () => reserveInventory(items, session));
        if (coupon) await recordPerformanceStage('coupon.reserve', () => reserveCouponRedemption({ customerId: userId, coupon, orderId, status: 'reserved', expiresAt: reservationExpiresAt, session }));
        const created = await createOrderRecord({ _id: orderId, orderNumber: orderNumber(), checkoutIdempotencyKey: input.idempotencyKey, checkoutRequestHash: requestHash, checkoutCartVersion: cart.version ?? 0, metaCheckoutEventId: input.metaEventId, user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: input.paymentMethod, paymentMode: mode, shippingMethod, logisticsQuoteId: logisticsQuote?.quoteId, paymentProvider: input.paymentMethod, subtotal, tax, shipping, discount, couponDiscount, bundleDiscount, bundleDiscountLabel: bundleSaving.label, codFee: 0, total, amountPaid: 0, amountDue: total, couponCode: coupon?.code, stockReserved: true, stockReservationExpiresAt: reservationExpiresAt, timeline: [{ status: 'pending', timestamp: new Date(), note: [coupon ? `Coupon ${coupon.code}` : '', bundleSaving.label].filter(Boolean).join(' · ') || 'Order created' }] }, session);
        if (logisticsQuote) await LogisticsQuoteService.consume(logisticsQuote.quoteId, session);
        await LogisticsJobService.enqueue('release_payment_reservation', { orderId: String(orderId) }, `release-payment-reservation:${orderId}`, 8, { session, runAt: reservationExpiresAt });
        return created;
      }));
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      const duplicate = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
      if (!duplicate) throw error;
      return await resolveExistingCheckout(userId, input.idempotencyKey, requestHash, duplicate);
    }
    try {
      const payment = await recordPerformanceStage('razorpay.create', () => PaymentService.getProvider(input.paymentMethod).createOrder(advance, 'INR', { localOrderId: String(order._id), orderNumber: order.orderNumber ?? String(order._id), paymentMode: mode }));
      if (input.paymentMethod === 'razorpay') order.razorpayOrderId = payment.id;
      else order.stripePaymentIntentId = payment.id;
      order.paymentAttempts.push({ providerOrderId: payment.id, amount: advance, status: 'created' });
      await order.save();
      return { order, payment, amountToPay: advance };
    } catch (error) {
      await withMongoTransaction(async (session) => {
        await restoreStock(order as never, session);
        if (coupon) await releaseCouponRedemption(String(order._id), session);
        if (logisticsQuote) await LogisticsQuoteService.release(logisticsQuote.quoteId, session);
        await OrderModel.updateOne({ _id: order._id, paymentStatus: 'pending' }, { $set: { paymentStatus: 'failed', stockReserved: false, stockReservationReleasedAt: new Date() }, $unset: { stockReservationExpiresAt: 1 }, $push: { timeline: { status: 'failed', timestamp: new Date(), note: 'Payment session could not be created; inventory was released' } } }, sessionOptions(session));
      });
      throw terminalCheckoutAttemptError(
        error instanceof ApiError ? error.message : 'Payment provider unavailable',
        error instanceof ApiError ? error.statusCode : 502
      );
    }
  },

  async createCodOrder(userId: string, input: CheckoutInput): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to place an order');
    const requestHash = checkoutRequestHash(input);
    const existing = await recordPerformanceStage('idempotency.load', () => OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey }));
    if (existing) {
      validateExistingAttempt(existing, requestHash);
      return existingCheckoutResult(existing);
    }
    const prepared = await prepareCheckout(userId, input, 'cod');
    const { cart, items, coupon, settings, subtotal, couponDiscount, bundleSaving, bundleDiscount, discount, logisticsQuote, shippingMethod, shipping } = prepared;
    if (settings.codCheckoutEnabled !== true) throw new ApiError(400, 'Cash on delivery is unavailable');
    const tax = 0;
    const codFee = money(settings.codFee ?? 49);
    const total = money(subtotal - discount + shipping + tax + codFee);
    if (total > env.MAX_COD_ORDER_VALUE) throw new ApiError(400, 'Cash on delivery is unavailable for this order value');
    const orderId = new Types.ObjectId();
    let order;
    try {
      order = await recordPerformanceStage('order.transaction', () => withMongoTransaction(async (session) => {
        await assertCartUnchangedInTransaction(cart, session);
        await recordPerformanceStage('stock.reserve', () => reserveInventory(items, session));
        if (coupon) await recordPerformanceStage('coupon.reserve', () => reserveCouponRedemption({ customerId: userId, coupon, orderId, status: 'confirmed', session }));
        const created = await createOrderRecord({ _id: orderId, orderNumber: orderNumber(), checkoutIdempotencyKey: input.idempotencyKey, checkoutRequestHash: requestHash, checkoutCartVersion: cart.version ?? 0, metaCheckoutEventId: input.metaEventId, user: userId, items, shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, paymentMethod: 'cod', paymentMode: 'cod', shippingMethod, logisticsQuoteId: logisticsQuote?.quoteId, paymentProvider: 'cod', paymentStatus: 'cod_pending', orderStatus: 'placed', subtotal, tax, shipping, discount, couponDiscount, bundleDiscount, bundleDiscountLabel: bundleSaving.label, codFee, total, amountPaid: 0, amountDue: total, couponCode: coupon?.code, stockReserved: true, timeline: [{ status: 'placed', timestamp: new Date(), note: ['COD order placed; payment due on delivery', bundleSaving.label].filter(Boolean).join(' · ') }] }, session);
        if (logisticsQuote) await LogisticsQuoteService.consume(logisticsQuote.quoteId, session);
        const deleted = await CartModel.deleteOne({ _id: cart._id, ...cartVersionFilter(cart.version ?? 0) }, sessionOptions(session));
        if (session && deleted.deletedCount !== 1) throw new ApiError(409, 'Your bag changed while checkout was being finalized');
        await LogisticsJobService.enqueue('order_created', { orderId: String(orderId) }, `order-created:${orderId}`, 8, { session });
        return created;
      }));
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      const duplicate = await OrderModel.findOne({ user: userId, checkoutIdempotencyKey: input.idempotencyKey });
      if (!duplicate) throw error;
      validateExistingAttempt(duplicate, requestHash);
      return existingCheckoutResult(duplicate);
    }
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
    } else if (status === 'failed' && !['paid', 'partially_paid', 'failed'].includes(order.paymentStatus)) {
      // Keep payment-attempt state, coupon release, quote release and stock
      // restoration in the same transaction. Persisting `failed` first could
      // strand reserved inventory if compensation subsequently failed.
      return await releaseActiveReservation(String(order._id), 'failed', details.event ?? 'Payment failed; inventory was released', providerOrderId);
    }
    await order.save();
    return order;
  },

  async reportPaymentFailure(orderId: string, userId: string, providerOrderId: string): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to update a payment');
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.razorpayOrderId || order.razorpayOrderId !== providerOrderId) throw new ApiError(409, 'Payment session does not match this order');
    if (['paid', 'partially_paid', 'authorized'].includes(order.paymentStatus)) throw new ApiError(409, 'A received payment cannot be marked failed');
    if (order.paymentStatus === 'failed' && !order.stockReserved) return order;
    return await releaseActiveReservation(orderId, 'failed', 'Razorpay reported that the payment attempt failed; inventory was released', providerOrderId) ?? order;
  },

  async reportPaymentCancellation(orderId: string, userId: string, providerOrderId: string): Promise<unknown> {
    if (!userId) throw new ApiError(401, 'Sign in is required to update a payment');
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.razorpayOrderId || order.razorpayOrderId !== providerOrderId) throw new ApiError(409, 'Payment session does not match this order');
    if (order.paymentStatus === 'cancelled' && order.orderStatus === 'cancelled') return order;
    if (['paid', 'partially_paid', 'authorized'].includes(order.paymentStatus) || order.paymentSettlementStartedAt) throw new ApiError(409, 'A received payment cannot be cancelled');
    if (order.paymentStatus !== 'pending' || order.orderStatus !== 'pending' || order.amountPaid > 0) throw new ApiError(409, 'Only an unpaid pending order can be cancelled from checkout');
    if (order.stockReserved) {
      const released = await releaseActiveReservation(orderId, 'cancelled', 'Customer closed the Razorpay payment window; inventory was released and no payment was collected', providerOrderId);
      if (released) return released;
    }
    const cancelledAt = new Date();
    const cancellation = { requestedBy: 'customer', reasonCode: 'payment_cancelled', reason: 'Payment cancelled at checkout', requestedAt: cancelledAt, cancelledAt, refundStatus: 'not_required', refundAmount: 0 };
    const cancelled = await OrderModel.findOneAndUpdate(
      { _id: orderId, user: userId, razorpayOrderId: providerOrderId, paymentStatus: 'pending', orderStatus: 'pending', amountPaid: 0, stockReserved: { $ne: true }, paymentSettlementStartedAt: { $exists: false } },
      { $set: { paymentStatus: 'cancelled', orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', amountDue: 0, stockReserved: false, cancellation, 'paymentAttempts.$[attempt].status': 'cancelled' }, $push: { timeline: { status: 'payment_cancelled', timestamp: cancelledAt, note: 'Customer closed the Razorpay payment window; no payment was collected' } } },
      { new: true, arrayFilters: [{ 'attempt.providerOrderId': providerOrderId, 'attempt.status': 'created' }] }
    );
    if (cancelled) return cancelled;
    const current = await OrderModel.findById(orderId);
    if (current?.paymentStatus === 'cancelled' && current.orderStatus === 'cancelled') return current;
    if (current?.paymentSettlementStartedAt || (current && ['paid', 'partially_paid', 'authorized'].includes(current.paymentStatus))) throw new ApiError(409, 'Payment is being finalized and cannot be cancelled');
    throw new ApiError(409, 'Order status changed; refresh and try again');
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
    const cancelled = await cancelOrderWithCompensation({
      orderId: id,
      filter: { user: userId, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, amountPaid: order.amountPaid },
      paymentStatus: order.amountPaid > 0 ? order.paymentStatus : 'cancelled',
      cancellation,
      timelineNote: `Customer cancelled: ${reason}${details ? ` — ${details}` : ''}`
    });
    if (!cancelled) {
      const current = await OrderModel.findById(id);
      if (current?.orderStatus === 'cancelled') return current;
      if (current?.paymentSettlementStartedAt) throw new ApiError(409, 'Payment is being finalized; wait a moment before cancelling');
      throw new ApiError(409, 'Order status changed; refresh and try again');
    }
    return cancelled;
  },

  async cancel(id: string, note?: string): Promise<unknown> {
    const order = await OrderModel.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.orderStatus === 'cancelled') return order;
    const cancelledAt = new Date();
    const details = note?.trim();
    const cancellation = { requestedBy: 'admin', reasonCode: 'admin_cancelled', reason: 'Cancelled by Cruisin', details, requestedAt: cancelledAt, cancelledAt, refundStatus: order.amountPaid > 0 ? 'required' : 'not_required', refundAmount: order.refundAmount ?? 0 };
    reconcileCancellationRefundState({ amountPaid: order.amountPaid, refunds: order.refunds, cancellation } as CancellationRefundOrder);
    const cancelled = await cancelOrderWithCompensation({
      orderId: id,
      filter: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, amountPaid: order.amountPaid },
      paymentStatus: order.amountPaid > 0 ? order.paymentStatus : 'cancelled',
      cancellation,
      timelineNote: details || 'Order cancelled by Cruisin'
    });
    if (!cancelled) {
      const current = await OrderModel.findById(id);
      if (current?.orderStatus === 'cancelled') return current;
      if (current?.paymentSettlementStartedAt) throw new ApiError(409, 'Payment is being finalized; wait a moment before cancelling');
      throw new ApiError(409, 'Order status changed; refresh and try again');
    }
    return cancelled;
  },

  async list(userId: string): Promise<unknown[]> { const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean(); return orders.map(normalizeOrderRead); },
  async adminList(view: 'active' | 'archived' | 'all' = 'active'): Promise<unknown[]> {
    const filter = view === 'archived' ? { archivedAt: { $exists: true } } : view === 'all' ? {} : { archivedAt: { $exists: false } };
    const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return orders.map(normalizeOrderRead);
  },
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
