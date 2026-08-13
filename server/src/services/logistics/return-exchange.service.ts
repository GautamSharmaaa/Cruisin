// Governed by .rules v1.0
import crypto from 'node:crypto';
import { Types, type HydratedDocument } from 'mongoose';
import { env } from '../../config/env.js';
import { logisticsConfig } from '../../config/logistics.js';
import { ExchangeRequestModel } from '../../models/exchange-request.model.js';
import { OrderModel } from '../../models/order.model.js';
import { ProductModel } from '../../models/product.model.js';
import { ReturnRequestModel, type ReturnRequestDocument } from '../../models/return-request.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import { UserModel } from '../../models/user.model.js';
import { ApiError } from '../../utils/api-error.js';
import { calculatePackage } from './package-calculator.js';
import { getLogisticsProvider } from './provider-factory.js';
import { LogisticsNotificationService } from './logistics-notification.service.js';
import { PaymentService } from '../payment.service.js';
import { OrderService } from '../order.service.js';
import { UploadService, type ReturnEvidenceInput } from '../upload.service.js';
import { RazorpayXPayoutService, type AlternateRefundDestination } from '../razorpayx-payout.service.js';
import { WalletService } from '../wallet.service.js';
import { RefundDestinationVault } from '../refund-destination-vault.service.js';

const requestNumber = (prefix: string): string => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const objectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw new ApiError(400, 'Invalid identifier');
  return new Types.ObjectId(value);
};
const returnWithoutEncryptedDestination = (request: HydratedDocument<ReturnRequestDocument>): Record<string, unknown> => {
  const safe = request.toObject() as Record<string, unknown> & { refundDestination?: Record<string, unknown> };
  if (safe.refundDestination) delete safe.refundDestination.encryptedDetails;
  return safe;
};
interface AddressOrder {
  user?: unknown;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

const address = async (order: AddressOrder) => {
  const user = order.user ? await UserModel.findById(order.user).select('email').lean() : null;
  return {
    name: order.shippingAddress.fullName,
    phone: order.shippingAddress.phone,
    email: user?.email ?? undefined,
    address: order.shippingAddress.line1,
    address2: order.shippingAddress.line2 ?? undefined,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    country: order.shippingAddress.country,
    postcode: order.shippingAddress.postalCode
  };
};

const orderItem = (order: { items: Array<{ product: unknown; variant: unknown; sku: string; title: string; size?: string | null; color?: string | null; price: number; quantity: number }> }, variantId: string) => {
  const item = order.items.find((candidate) => String(candidate.variant) === variantId);
  if (!item) throw new ApiError(400, 'Selected item is not part of this order');
  return item;
};

const loadProductVariant = async (productId: unknown, variantId: unknown) => {
  const product = await ProductModel.findById(productId);
  const variant = product?.variants.find((candidate) => String(candidate._id) === String(variantId));
  if (!product || !variant) throw new ApiError(409, 'Product variant is unavailable');
  return { product, variant };
};

const assertDeliveredOrder = async (orderId: string, customerId: string) => {
  const order = await OrderModel.findOne({ _id: objectId(orderId), user: objectId(customerId), archivedAt: { $exists: false }, isTestOrder: { $ne: true }, isAnalyticsTestData: { $ne: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.orderStatus !== 'delivered') throw new ApiError(409, 'Returns and exchanges are available after delivery');
  const shipment = await ShipmentModel.findOne({ order: order._id, shipmentType: 'forward', shipmentStatus: 'delivered' }).lean();
  if (!shipment?.deliveredDate || Date.now() - shipment.deliveredDate.getTime() > 14 * 86_400_000) throw new ApiError(409, 'The 14-day return and exchange window has ended');
  return order;
};

const ensureReverseShipment = async (request: {
  _id: unknown;
  requestNumber: string;
  order: unknown;
  item?: { product: unknown; variant: unknown; sku: string; quantity: number } | null;
  items?: Array<{ product: unknown; variant: unknown; sku: string; quantity: number }> | null;
  reason: string;
  reverseShipment?: unknown;
}, adminId: string) => {
  if (request.reverseShipment) return ShipmentModel.findById(request.reverseShipment);
  const requestItems = request.items?.length ? request.items : request.item ? [request.item] : [];
  if (!requestItems.length) throw new ApiError(409, 'Return request item data is missing');
  const order = await OrderModel.findById(request.order);
  if (!order) throw new ApiError(404, 'Order not found');
  const loadedItems = await Promise.all(requestItems.map(async (requestItem) => {
    const item = orderItem(order, String(requestItem.variant));
    const { product, variant } = await loadProductVariant(requestItem.product, requestItem.variant);
    return { item, product, variant, quantity: requestItem.quantity };
  }));
  const parcel = await calculatePackage(loadedItems.map(({ product, variant, quantity }) => ({ product, variant, quantity })));
  let shipment = await ShipmentModel.create({
    order: order._id,
    shipmentType: 'return',
    sourceOrderId: request.requestNumber,
    pickupLocation: logisticsConfig.pickupLocation ?? 'Mock Warehouse',
    package: parcel,
    shipmentStatus: 'pending_provider',
    returnStatus: 'approved',
    idempotencyKey: `return:${request._id}`,
    createdBy: objectId(adminId)
  });
  try {
    const original = await ShipmentModel.findOne({ order: order._id, shipmentType: 'forward' }).lean();
    const result = await getLogisticsProvider().createReturn({
      localOrderId: String(order._id),
      sourceOrderId: request.requestNumber,
      orderDate: new Date(),
      pickupLocation: logisticsConfig.pickupLocation ?? 'Mock Warehouse',
      address: await address(order),
      items: loadedItems.map(({ item, quantity }) => ({ name: item.title, sku: item.sku, units: quantity, sellingPrice: item.price, discount: 0, tax: 0 })),
      paymentMode: 'prepaid',
      subtotal: loadedItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0),
      shippingCharge: 0,
      totalDiscount: 0,
      total: loadedItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0),
      package: parcel,
      originalAwb: original?.awb ?? undefined,
      returnReason: request.reason
    });
    shipment.providerOrderId = result.providerOrderId;
    shipment.providerShipmentId = result.providerShipmentId;
    shipment.awb = result.awb;
    shipment.rawProviderStatus = result.status;
    shipment.shipmentStatus = result.awb ? 'awb_assigned' : 'provider_order_created';
    shipment.returnStatus = 'reverse_pickup';
    await shipment.save();
    return shipment;
  } catch (error) {
    shipment.shipmentStatus = 'error';
    shipment.lastProviderError = { code: 'provider_error', message: error instanceof Error ? error.message : 'Return pickup failed', retryable: true, occurredAt: new Date() };
    await shipment.save();
    throw error;
  }
};

const ensureReplacementShipment = async (request: {
  _id: unknown;
  requestNumber: string;
  order: unknown;
  requestedVariant: unknown;
  requestedSku: string;
  originalItem?: { product: unknown; quantity: number } | null;
  replacementShipment?: unknown;
}, adminId: string) => {
  if (request.replacementShipment) return ShipmentModel.findById(request.replacementShipment);
  if (!request.originalItem) throw new ApiError(409, 'Exchange request item data is missing');
  const order = await OrderModel.findById(request.order);
  if (!order) throw new ApiError(404, 'Order not found');
  const { product, variant } = await loadProductVariant(request.originalItem.product, request.requestedVariant);
  const parcel = await calculatePackage([{ product, variant, quantity: request.originalItem.quantity }]);
  let shipment = await ShipmentModel.create({
    order: order._id,
    shipmentType: 'exchange_replacement',
    sourceOrderId: `REPLACEMENT-${request.requestNumber}`,
    pickupLocation: logisticsConfig.pickupLocation ?? 'Mock Warehouse',
    package: parcel,
    shipmentStatus: 'pending_provider',
    exchangeStatus: 'replacement_pending',
    idempotencyKey: `exchange-replacement:${request._id}`,
    createdBy: objectId(adminId)
  });
  try {
    const unitPrice = variant.priceOverride ?? variant.price;
    const result = await getLogisticsProvider().createOrder({
      localOrderId: String(order._id),
      sourceOrderId: shipment.sourceOrderId,
      orderDate: new Date(),
      pickupLocation: shipment.pickupLocation,
      address: await address(order),
      items: [{ name: product.title, sku: variant.sku, units: request.originalItem.quantity, sellingPrice: unitPrice, discount: 0, tax: 0 }],
      paymentMode: 'prepaid',
      subtotal: unitPrice * request.originalItem.quantity,
      shippingCharge: 0,
      totalDiscount: 0,
      total: unitPrice * request.originalItem.quantity,
      package: parcel
    });
    const awb = await getLogisticsProvider().assignCourier({ providerShipmentId: result.providerShipmentId });
    shipment.providerOrderId = result.providerOrderId;
    shipment.providerShipmentId = result.providerShipmentId;
    shipment.awb = awb.awb;
    shipment.courierId = awb.courierId;
    shipment.courierName = awb.courierName;
    shipment.rawProviderStatus = awb.status;
    shipment.shipmentStatus = 'awb_assigned';
    shipment.exchangeStatus = 'replacement_shipped';
    await shipment.save();
    return shipment;
  } catch (error) {
    shipment.shipmentStatus = 'error';
    shipment.lastProviderError = { code: 'provider_error', message: error instanceof Error ? error.message : 'Replacement shipment failed', retryable: true, occurredAt: new Date() };
    await shipment.save();
    throw error;
  }
};

type ReturnInput = {
  orderId: string;
  items: Array<{ variantId: string; quantity: number }>;
  reason: string;
  details: string;
  evidence: ReturnEvidenceInput[];
  idempotencyKey: string;
};

const returnPaymentResponse = (request: { _id: unknown; requestNumber: string; handlingFee: number; handlingFeePaymentStatus: string; handlingFeeProviderOrderId?: string | null; status: string }) => ({
  request: {
    id: String(request._id),
    requestNumber: request.requestNumber,
    status: request.status,
    handlingFee: request.handlingFee,
    handlingFeePaymentStatus: request.handlingFeePaymentStatus
  },
  payment: request.handlingFeePaymentStatus === 'paid' || !request.handlingFeeProviderOrderId ? null : {
    id: request.handlingFeeProviderOrderId,
    amount: request.handlingFee,
    currency: 'INR',
    provider: 'razorpay' as const
  }
});

const initializeReturnPayment = async (request: HydratedDocument<ReturnRequestDocument> | null) => {
  if (!request) throw new ApiError(404, 'Return request not found');
  if (request.handlingFeePaymentStatus === 'paid' || request.handlingFeeProviderOrderId) return returnPaymentResponse(request);
  const claimed = await ReturnRequestModel.findOneAndUpdate(
    { _id: request._id, handlingFeeProviderOrderId: { $exists: false }, handlingFeePaymentStatus: { $in: ['pending', 'failed'] } },
    { $set: { handlingFeePaymentStatus: 'initializing' } },
    { new: true }
  );
  if (!claimed) {
    const current = await ReturnRequestModel.findById(request._id);
    if (current?.handlingFeeProviderOrderId || current?.handlingFeePaymentStatus === 'paid') return returnPaymentResponse(current);
    throw new ApiError(409, 'Return payment initialization is already in progress');
  }
  try {
    const payment = await PaymentService.getProvider('razorpay').createOrder(claimed.handlingFee, 'INR', {
      purpose: 'return_handling_fee',
      returnRequestId: String(claimed._id),
      returnRequestNumber: claimed.requestNumber
    });
    claimed.handlingFeeProviderOrderId = payment.id;
    claimed.handlingFeePaymentStatus = 'pending';
    await claimed.save();
    return returnPaymentResponse(claimed);
  } catch (error) {
    claimed.handlingFeePaymentStatus = 'failed';
    await claimed.save();
    throw error;
  }
};

const submitPaidReturn = async (providerOrderId: string, paymentReference: string, customerId?: string) => {
  const filter: Record<string, unknown> = {
    handlingFeeProviderOrderId: providerOrderId,
    handlingFeePaymentStatus: { $ne: 'paid' }
  };
  if (customerId) filter.customer = objectId(customerId);
  const updated = await ReturnRequestModel.findOneAndUpdate(filter, {
    $set: {
      handlingFeePaymentStatus: 'paid',
      handlingFeePaymentReference: paymentReference,
      handlingFeePaidAt: new Date(),
      status: 'requested'
    },
    $push: { history: { action: 'requested', note: 'Return handling fee verified', createdAt: new Date() } }
  }, { new: true });
  if (updated) {
    await LogisticsNotificationService.emit({ eventType: 'return_submitted', orderId: String(updated.order), entityReference: String(updated._id), dedupeKey: `return_submitted:return:${updated._id}` });
    return updated;
  }
  return ReturnRequestModel.findOne({ handlingFeeProviderOrderId: providerOrderId, ...(customerId ? { customer: objectId(customerId) } : {}) });
};

const exchangePaymentResponse = (request: { _id: unknown; requestNumber: string; handlingFee: number; handlingFeePaymentStatus: string; handlingFeeProviderOrderId?: string | null; status: string }) => ({
  request: { id: String(request._id), requestNumber: request.requestNumber, status: request.status, handlingFee: request.handlingFee, handlingFeePaymentStatus: request.handlingFeePaymentStatus },
  payment: request.handlingFeePaymentStatus === 'paid' || !request.handlingFeeProviderOrderId ? null : { id: request.handlingFeeProviderOrderId, amount: request.handlingFee, currency: 'INR', provider: 'razorpay' as const }
});
const initializeExchangePayment = async (request: HydratedDocument<import('../../models/exchange-request.model.js').ExchangeRequestDocument> | null) => {
  if (!request) throw new ApiError(404, 'Exchange request not found');
  if (request.handlingFeePaymentStatus === 'paid' || request.handlingFeeProviderOrderId) return exchangePaymentResponse(request);
  const claimed = await ExchangeRequestModel.findOneAndUpdate({ _id: request._id, handlingFeeProviderOrderId: { $exists: false }, handlingFeePaymentStatus: { $in: ['pending', 'failed'] } }, { $set: { handlingFeePaymentStatus: 'initializing' } }, { new: true });
  if (!claimed) throw new ApiError(409, 'Exchange payment initialization is already in progress');
  try {
    const payment = await PaymentService.getProvider('razorpay').createOrder(claimed.handlingFee, 'INR', { purpose: 'exchange_handling_fee', exchangeRequestId: String(claimed._id), exchangeRequestNumber: claimed.requestNumber });
    claimed.handlingFeeProviderOrderId = payment.id;
    claimed.handlingFeePaymentStatus = 'pending';
    await claimed.save();
    return exchangePaymentResponse(claimed);
  } catch (error) { claimed.handlingFeePaymentStatus = 'failed'; await claimed.save(); throw error; }
};
const submitPaidExchange = async (providerOrderId: string, paymentReference: string, customerId: string) => ExchangeRequestModel.findOneAndUpdate({ handlingFeeProviderOrderId: providerOrderId, customer: objectId(customerId), handlingFeePaymentStatus: { $ne: 'paid' } }, { $set: { handlingFeePaymentStatus: 'paid', handlingFeePaymentReference: paymentReference, handlingFeePaidAt: new Date(), status: 'requested' }, $push: { history: { action: 'requested', note: 'Exchange handling fee verified', createdAt: new Date() } } }, { new: true });

type RefundDestinationInput =
  | { method: 'original_payment' }
  | { method: 'wallet' }
  | { method: 'upi'; upiId: string }
  | { method: 'bank'; accountHolderName: string; accountNumber: string; confirmAccountNumber: string; ifsc: string };
type AdminRefundDestinationInput = Extract<RefundDestinationInput, { method: 'wallet' | 'upi' }>;
const refundMethods = (order?: { paymentProvider?: string; razorpayPaymentId?: string | null; amountPaid?: number; refunds?: Array<{ amount: number; status: string }> } | null, requestedAmount = 0) => {
  const committedRefunds = order?.refunds?.filter((refund) => ['created', 'pending', 'processed'].includes(refund.status)).reduce((sum, refund) => sum + refund.amount, 0) ?? 0;
  const originalPaymentAvailable = order?.paymentProvider === 'razorpay' && order.razorpayPaymentId && Number(order.amountPaid) - committedRefunds >= requestedAmount;
  return [
  ...(originalPaymentAvailable ? ['original_payment' as const] : []),
  'wallet' as const,
  ...(RazorpayXPayoutService.available() || env.MANUAL_REFUND_UPI_ENABLED ? ['upi' as const] : []),
  ...(RazorpayXPayoutService.available() ? ['bank' as const] : [])
  ];
};
const maskedUpi = (upiId: string): string => {
  const [name = '', handle = ''] = upiId.split('@');
  return `${name.slice(0, 1)}${'*'.repeat(Math.min(6, Math.max(2, name.length - 1)))}@${handle}`;
};
const destinationForProvider = (input: RefundDestinationInput): AlternateRefundDestination => input.method === 'upi'
  ? input
  : input.method === 'bank'
    ? { method: 'bank', accountHolderName: input.accountHolderName, accountNumber: input.accountNumber, ifsc: input.ifsc }
    : (() => { throw new ApiError(400, 'Bank or UPI refund destination is required'); })();

const saveRefundDestination = async (
  requestId: string,
  input: RefundDestinationInput,
  actor: { id: string; role: 'customer' | 'admin' | 'superadmin' }
): Promise<unknown> => {
  const ownershipFilter = actor.role === 'customer' ? { customer: objectId(actor.id) } : {};
  const request = await ReturnRequestModel.findOne({ _id: objectId(requestId), ...ownershipFilter });
  if (!request) throw new ApiError(404, 'Return request not found');
  if (request.status !== 'refund_window_open' || !['awaiting_destination', 'ready', 'failed'].includes(request.refundStatus)) throw new ApiError(409, 'The refund destination window is not open');
  if (actor.role !== 'customer' && !['wallet', 'upi'].includes(input.method)) throw new ApiError(400, 'Admin may choose Cruisin Wallet or customer UPI only');
  const [order, customer] = await Promise.all([
    OrderModel.findById(request.order).select('paymentProvider razorpayPaymentId amountPaid refunds').lean(),
    UserModel.findById(request.customer).select('name email phone').lean()
  ]);
  if (!order || !customer) throw new ApiError(404, 'Return customer or order was not found');
  if (!refundMethods(order, request.productRefundAmount ?? 0).includes(input.method)) throw new ApiError(400, input.method === 'upi' || input.method === 'bank' ? 'Bank or UPI refunds are not configured' : 'This refund method is unavailable for the order');
  const now = new Date();
  const actorFields = { submittedBy: objectId(actor.id), submittedByRole: actor.role, submittedAt: now };
  let refundDestination: Record<string, unknown>;
  let refundStatus: 'ready' | 'awaiting_destination';
  if (input.method === 'original_payment' || input.method === 'wallet') {
    refundDestination = {
      method: input.method,
      verificationStatus: 'verified',
      maskedDetails: input.method === 'wallet' ? 'Cruisin Wallet' : 'Original Razorpay payment method',
      registeredName: customer.name,
      verifiedAt: now,
      ...actorFields
    };
    refundStatus = 'ready';
  } else if (input.method === 'upi' && !RazorpayXPayoutService.available() && env.MANUAL_REFUND_UPI_ENABLED) {
    const normalizedUpi = input.upiId.trim().toLowerCase();
    refundDestination = {
      method: 'upi',
      verificationStatus: 'pending',
      maskedDetails: maskedUpi(normalizedUpi),
      encryptedDetails: RefundDestinationVault.encrypt(normalizedUpi),
      ...actorFields
    };
    refundStatus = 'awaiting_destination';
  } else {
    const result = await RazorpayXPayoutService.validateDestination({ id: String(request.customer), name: customer.name, email: customer.email, phone: customer.phone ?? undefined }, destinationForProvider(input), `refund-${request._id}`);
    refundDestination = {
      method: input.method,
      verificationStatus: result.status,
      maskedDetails: input.method === 'upi' ? maskedUpi(input.upiId) : `Bank account ending ${input.accountNumber.slice(-4)} · ${input.ifsc}`,
      registeredName: result.registeredName,
      providerValidationId: result.validationId,
      providerFundAccountId: result.fundAccountId,
      ...(input.method === 'upi' ? { encryptedDetails: RefundDestinationVault.encrypt(input.upiId.trim().toLowerCase()) } : {}),
      ...(result.status === 'verified' ? { verifiedAt: now } : {}),
      ...actorFields
    };
    refundStatus = result.status === 'verified' ? 'ready' : 'awaiting_destination';
  }
  const action = actor.role === 'customer' ? 'refund_destination_submitted' : 'refund_destination_set_by_admin';
  const updated = await ReturnRequestModel.findOneAndUpdate(
    { _id: request._id, ...ownershipFilter, status: 'refund_window_open', refundStatus: { $in: ['awaiting_destination', 'ready', 'failed'] } },
    {
      $set: { refundDestination, refundStatus },
      $push: { history: { action, note: `${input.method.replaceAll('_', ' ')} · ${String(refundDestination.verificationStatus)}`, ...(actor.role === 'customer' ? {} : { admin: objectId(actor.id) }), createdAt: now } }
    },
    { new: true }
  ).select('+refundDestination.encryptedDetails');
  if (!updated) throw new ApiError(409, 'The refund destination can no longer be changed');
  const fullUpi = updated.refundDestination?.method === 'upi' && updated.refundDestination.encryptedDetails
    ? RefundDestinationVault.decrypt(updated.refundDestination.encryptedDetails)
    : undefined;
  return {
    _id: String(updated._id),
    status: updated.status,
    refundStatus: updated.refundStatus,
    refundDestination: updated.refundDestination ? {
      method: updated.refundDestination.method,
      verificationStatus: updated.refundDestination.verificationStatus,
      maskedDetails: updated.refundDestination.maskedDetails,
      upiId: fullUpi,
      registeredName: updated.refundDestination.registeredName,
      submittedByRole: updated.refundDestination.submittedByRole,
      submittedAt: updated.refundDestination.submittedAt,
      verifiedAt: updated.refundDestination.verifiedAt
    } : undefined
  };
};

export const ReturnExchangeService = {
  async createReturn(customerId: string, input: ReturnInput): Promise<unknown> {
    const existing = await ReturnRequestModel.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      if (String(existing.customer) !== customerId) throw new ApiError(409, 'Return request key is already in use');
      if (existing.handlingFeePaymentStatus === 'failed' && !existing.handlingFeeProviderOrderId) existing.handlingFeePaymentStatus = 'pending';
      return initializeReturnPayment(existing);
    }
    const order = await assertDeliveredOrder(input.orderId, customerId);
    const uniqueVariants = new Set(input.items.map((item) => item.variantId));
    if (uniqueVariants.size !== input.items.length) throw new ApiError(400, 'Each order item may appear only once in a return request');
    const [activeReturns, activeExchanges] = await Promise.all([
      ReturnRequestModel.find({ order: order._id, status: { $nin: ['rejected', 'closed'] } }).select('item items').lean(),
      ExchangeRequestModel.find({ order: order._id, status: { $nin: ['rejected', 'closed'] } }).select('originalItem').lean()
    ]);
    const selected = input.items.map(({ variantId, quantity }) => {
      const item = orderItem(order, variantId);
      const alreadyRequested = activeReturns.reduce((sum, request) => {
        const requestItems = request.items?.length ? request.items : request.item ? [request.item] : [];
        return sum + requestItems.filter((candidate) => String(candidate.variant) === variantId).reduce((itemSum, candidate) => itemSum + candidate.quantity, 0);
      }, 0) + activeExchanges.reduce((sum, request) => String(request.originalItem?.variant) === variantId ? sum + (request.originalItem?.quantity ?? 0) : sum, 0);
      if (quantity > item.quantity - alreadyRequested) throw new ApiError(409, 'Return quantity exceeds the remaining eligible quantity');
      return { product: item.product, variant: item.variant, sku: item.sku, title: item.title, size: item.size ?? undefined, color: item.color ?? undefined, quantity };
    });
    const evidence = input.evidence.map((photo) => UploadService.validateReturnEvidence(photo, customerId));
    const selectedGross = selected.reduce((sum, item) => {
      const purchased = orderItem(order, String(item.variant));
      return sum + purchased.price * item.quantity;
    }, 0);
    const merchandiseNetRatio = order.subtotal > 0 ? Math.max(0, order.subtotal - order.discount) / order.subtotal : 0;
    const productRefundAmount = Math.round(selectedGross * merchandiseNetRatio * 100) / 100;
    if (productRefundAmount <= 0) throw new ApiError(409, 'The selected items do not have a refundable product value');
    let request: HydratedDocument<ReturnRequestDocument>;
    try {
      request = await ReturnRequestModel.create({
      requestNumber: requestNumber('RET'),
      order: order._id,
      customer: objectId(customerId),
      item: selected[0],
      items: selected,
      reason: input.reason,
      details: input.details,
      evidence,
      status: 'payment_pending',
      handlingFee: env.RETURN_HANDLING_FEE,
      handlingFeePaymentStatus: 'pending',
      productRefundAmount,
      idempotencyKey: input.idempotencyKey,
      history: [{ action: 'payment_initialized', note: 'Return details validated; payment required' }]
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
        const raced = await ReturnRequestModel.findOne({ idempotencyKey: input.idempotencyKey, customer: objectId(customerId) });
        if (raced) return initializeReturnPayment(raced);
      }
      throw error;
    }
    return initializeReturnPayment(request);
  },

  async verifyReturnPayment(customerId: string, input: { requestId: string; payload: Record<string, unknown> }): Promise<unknown> {
    const request = await ReturnRequestModel.findOne({ _id: objectId(input.requestId), customer: objectId(customerId) });
    if (!request) throw new ApiError(404, 'Return request not found');
    if (request.handlingFeePaymentStatus === 'paid') return request;
    const providerOrderId = typeof input.payload.razorpay_order_id === 'string' ? input.payload.razorpay_order_id : '';
    const paymentReference = typeof input.payload.razorpay_payment_id === 'string' ? input.payload.razorpay_payment_id : '';
    if (!request.handlingFeeProviderOrderId || providerOrderId !== request.handlingFeeProviderOrderId || !paymentReference) throw new ApiError(409, 'Payment session does not match this return request');
    if (!await PaymentService.getProvider('razorpay').verifyPayment(input.payload)) throw new ApiError(400, 'Payment verification failed');
    const submitted = await submitPaidReturn(providerOrderId, paymentReference, customerId);
    if (!submitted) throw new ApiError(409, 'Return request could not be submitted');
    return submitted;
  },

  async settleReturnPayment(providerOrderId: string, paymentReference: string): Promise<boolean> {
    if (!providerOrderId || !paymentReference) return false;
    return Boolean(await submitPaidReturn(providerOrderId, paymentReference));
  },

  async wallet(customerId: string): Promise<unknown> {
    return WalletService.balance(customerId);
  },

  async submitRefundDestination(customerId: string, requestId: string, input: RefundDestinationInput): Promise<unknown> {
    return saveRefundDestination(requestId, input, { id: customerId, role: 'customer' });
  },

  async setRefundDestinationByAdmin(requestId: string, input: AdminRefundDestinationInput, adminId: string, role: 'admin' | 'superadmin'): Promise<unknown> {
    return saveRefundDestination(requestId, input, { id: adminId, role });
  },

  async refreshRefundDestination(customerId: string, requestId: string): Promise<unknown> {
    const request = await ReturnRequestModel.findOne({ _id: objectId(requestId), customer: objectId(customerId) });
    if (!request) throw new ApiError(404, 'Return request not found');
    const method = request.refundDestination?.method;
    const validationId = request.refundDestination?.providerValidationId;
    if ((method !== 'upi' && method !== 'bank') || !validationId) throw new ApiError(409, 'This refund destination does not require provider verification');
    const destination = request.refundDestination;
    if (!destination) throw new ApiError(409, 'Refund destination is missing');
    if (!['refund_window_open', 'refund_pending'].includes(request.status)) throw new ApiError(409, 'Refund destination verification cannot be refreshed now');
    const result = await RazorpayXPayoutService.refreshValidation(validationId);
    destination.verificationStatus = result.status;
    destination.registeredName = result.registeredName;
    destination.providerFundAccountId = result.fundAccountId;
    if (result.status === 'verified') {
      destination.verifiedAt = new Date();
      request.refundStatus = 'ready';
    } else if (result.status === 'failed') request.refundStatus = 'awaiting_destination';
    request.history.push({ action: 'refund_destination_verification_refreshed', note: result.status, createdAt: new Date() });
    await request.save();
    return request;
  },

  async createExchange(customerId: string, input: { orderId: string; variantId: string; requestedVariantId: string; quantity: number; idempotencyKey: string }): Promise<unknown> {
    const existing = await ExchangeRequestModel.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      if (String(existing.customer) !== customerId) throw new ApiError(409, 'Exchange request key is already in use');
      return initializeExchangePayment(existing);
    }
    const order = await assertDeliveredOrder(input.orderId, customerId);
    const item = orderItem(order, input.variantId);
    if (input.quantity > item.quantity) throw new ApiError(400, 'Exchange quantity exceeds the purchased quantity');
    const { product, variant } = await loadProductVariant(item.product, input.requestedVariantId);
    if (variant.stock < input.quantity || variant.enabled === false) throw new ApiError(409, 'Requested replacement is out of stock');
    const request = await ExchangeRequestModel.create({
      requestNumber: requestNumber('EXC'),
      order: order._id,
      customer: objectId(customerId),
      originalItem: { product: item.product, variant: item.variant, sku: item.sku, quantity: input.quantity },
      requestedVariant: variant._id,
      requestedSku: variant.sku,
      additionalAmount: Math.max(0, (variant.priceOverride ?? variant.price) - item.price) * input.quantity,
      refundDifference: Math.max(0, item.price - (variant.priceOverride ?? variant.price)) * input.quantity,
      handlingFee: env.RETURN_HANDLING_FEE,
      handlingFeePaymentStatus: 'pending',
      status: 'payment_pending',
      idempotencyKey: input.idempotencyKey,
      history: [{ action: 'payment_initialized', note: `Exchange details validated; payment required for ${product.title} / ${variant.sku}` }]
    });
    return initializeExchangePayment(request);
  },

  async verifyExchangePayment(customerId: string, input: { requestId: string; payload: Record<string, unknown> }): Promise<unknown> {
    const request = await ExchangeRequestModel.findOne({ _id: objectId(input.requestId), customer: objectId(customerId) });
    if (!request) throw new ApiError(404, 'Exchange request not found');
    if (request.handlingFeePaymentStatus === 'paid') return request;
    const providerOrderId = typeof input.payload.razorpay_order_id === 'string' ? input.payload.razorpay_order_id : '';
    const paymentReference = typeof input.payload.razorpay_payment_id === 'string' ? input.payload.razorpay_payment_id : '';
    if (!request.handlingFeeProviderOrderId || providerOrderId !== request.handlingFeeProviderOrderId || !paymentReference) throw new ApiError(409, 'Payment session does not match this exchange request');
    if (!await PaymentService.getProvider('razorpay').verifyPayment(input.payload)) throw new ApiError(400, 'Payment verification failed');
    const submitted = await submitPaidExchange(providerOrderId, paymentReference, customerId);
    if (!submitted) throw new ApiError(409, 'Exchange request could not be submitted');
    return submitted;
  },

  async exchangeOptions(customerId: string, orderId: string): Promise<unknown> {
    const order = await assertDeliveredOrder(orderId, customerId);
    const productIds = [...new Set(order.items.map((item) => String(item.product)))];
    const products = await ProductModel.find({ _id: { $in: productIds } }).select('title variants').lean();
    const productsById = new Map(products.map((product) => [String(product._id), product]));
    return {
      items: order.items.map((item) => {
        const product = productsById.get(String(item.product));
        return {
          variantId: String(item.variant), productId: String(item.product), title: item.title, sku: item.sku,
          size: item.size ?? undefined, color: item.color ?? undefined, quantity: item.quantity,
          alternatives: (product?.variants ?? []).map((variant) => ({
            id: String(variant._id), size: variant.size, color: variant.color, colorHex: variant.colorHex,
            sku: variant.sku, price: variant.priceOverride ?? variant.price, stock: variant.stock,
            enabled: variant.enabled !== false
          }))
        };
      })
    };
  },

  async mine(customerId: string): Promise<unknown> {
    const [returns, exchanges] = await Promise.all([
      ReturnRequestModel.find({ customer: objectId(customerId) }).select('+refundDestination.encryptedDetails').sort({ createdAt: -1 }).lean(),
      ExchangeRequestModel.find({ customer: objectId(customerId) }).sort({ createdAt: -1 }).lean()
    ]);
    const returnOrders = await OrderModel.find({ _id: { $in: returns.map((request) => request.order) } }).select('paymentProvider razorpayPaymentId amountPaid refunds').lean();
    const ordersById = new Map(returnOrders.map((order) => [String(order._id), order]));
    return {
      returns: returns.map((request) => ({
        _id: String(request._id),
        requestNumber: request.requestNumber,
        order: String(request.order),
        items: request.items?.length ? request.items : request.item ? [request.item] : [],
        reason: request.reason,
        details: request.details,
        evidence: (request.evidence ?? []).map((photo) => ({ url: UploadService.returnEvidenceUrl(photo), format: photo.format })),
        status: request.status,
        handlingFee: request.handlingFee,
        handlingFeePaymentStatus: request.handlingFeePaymentStatus,
        handlingFeePaidAt: request.handlingFeePaidAt,
        pickupStatus: request.reverseShipment ? 'Pickup workflow started' : 'Not scheduled',
        refundStatus: request.refundStatus,
        refundWindowOpenedAt: request.refundWindowOpenedAt,
        refundDestination: request.refundDestination ? {
          method: request.refundDestination.method,
          verificationStatus: request.refundDestination.verificationStatus,
          maskedDetails: request.refundDestination.maskedDetails,
          upiId: request.refundDestination.method === 'upi' && request.refundDestination.encryptedDetails ? RefundDestinationVault.decrypt(request.refundDestination.encryptedDetails) : undefined,
          registeredName: request.refundDestination.registeredName,
          submittedByRole: request.refundDestination.submittedByRole,
          submittedAt: request.refundDestination.submittedAt,
          verifiedAt: request.refundDestination.verifiedAt
        } : undefined,
        refundAvailableMethods: request.status === 'refund_window_open' ? refundMethods(ordersById.get(String(request.order)), request.productRefundAmount ?? 0) : [],
        refundUpiMode: RazorpayXPayoutService.available() ? 'provider_verified' : env.MANUAL_REFUND_UPI_ENABLED ? 'manual_admin' : undefined,
        productRefundAmount: request.productRefundAmount,
        manualTransferReference: request.manualTransferReference,
        manualTransferredAt: request.manualTransferredAt,
        latestUpdate: request.history.at(-1)?.createdAt ?? request.updatedAt,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      })),
      exchanges: exchanges.map((request) => ({
        _id: String(request._id), requestNumber: request.requestNumber, order: String(request.order), originalItem: request.originalItem,
        requestedSku: request.requestedSku, status: request.status, additionalAmount: request.additionalAmount,
        refundDifference: request.refundDifference, createdAt: request.createdAt, updatedAt: request.updatedAt
      }))
    };
  },

  async listReturns(role = 'viewer'): Promise<unknown> {
    const elevated = role === 'admin' || role === 'superadmin';
    const query = ReturnRequestModel.find()
      .populate('order')
      .populate('customer', 'name email phone')
      .populate('reverseShipment', 'shipmentStatus returnStatus courierName awb pickupStatus trackingScans lastTrackingUpdate')
      .sort({ createdAt: -1 }).limit(500);
    if (elevated) query.select('+refundDestination.encryptedDetails');
    const requests = await query.lean();
    return requests.map((request) => {
      let manualUpiId: string | undefined;
      let destinationReadError = false;
      if (elevated && request.refundDestination?.encryptedDetails) {
        try {
          manualUpiId = RefundDestinationVault.decrypt(request.refundDestination.encryptedDetails);
        } catch {
          destinationReadError = true;
        }
      }
      return {
        ...request,
        refundDestination: request.refundDestination ? {
          ...request.refundDestination,
          encryptedDetails: undefined,
          manualUpiId,
          ...(destinationReadError ? { destinationReadError: true } : {})
        } : undefined,
        evidence: (request.evidence ?? []).map((photo) => ({ url: UploadService.returnEvidenceUrl(photo), format: photo.format })),
        handlingFeeProviderOrderId: undefined
      };
    });
  },

  async listExchanges(): Promise<unknown> {
    return ExchangeRequestModel.find().populate('order').sort({ createdAt: -1 }).limit(500).lean();
  },

  async actOnReturn(requestId: string, input: { action: string; note?: string; upiId?: string; transactionReference?: string; transferredAt?: string }, adminId: string): Promise<unknown> {
    let request = await ReturnRequestModel.findById(objectId(requestId)).select('+refundDestination.encryptedDetails');
    if (!request) throw new ApiError(404, 'Return request not found');
    if (input.action === 'record_manual_upi_refund' && request.status === 'refunded' && request.manualTransferReference === input.transactionReference) return returnWithoutEncryptedDestination(request);
    const transitions: Record<string, string[]> = {
      requested: ['more_information', 'approved', 'rejected'],
      more_information: ['approved', 'rejected'],
      approved: ['create_reverse_pickup'],
      reverse_pickup: ['warehouse_received'],
      in_transit: ['warehouse_received'],
      warehouse_received: ['quality_check_passed', 'quality_check_failed'],
      quality_check_passed: ['open_refund_window'],
      refund_window_open: ['refund_pending', 'record_manual_upi_refund'],
      refund_pending: ['refunded'],
      refunded: ['closed'],
      quality_check_failed: ['closed'],
      rejected: ['closed']
    };
    if (!(transitions[request.status] ?? []).includes(input.action)) throw new ApiError(409, `Return cannot perform ${input.action} from ${request.status}`);
    if (input.action === 'create_reverse_pickup') {
      const shipment = await ensureReverseShipment(request, adminId);
      request.reverseShipment = shipment?._id;
      request.status = 'reverse_pickup';
    } else if (input.action === 'open_refund_window') {
      request.status = 'refund_window_open';
      request.refundStatus = 'awaiting_destination';
      request.refundWindowOpenedAt = new Date();
      request.refundWindowOpenedBy = objectId(adminId);
    } else if (input.action === 'refund_pending') {
      const claimed = await ReturnRequestModel.findOneAndUpdate(
        { _id: request._id, status: 'refund_window_open', refundStatus: { $in: ['ready', 'failed'] }, 'refundDestination.verificationStatus': 'verified' },
        { $set: { refundStatus: 'initializing' } },
        { new: true }
      );
      if (!claimed) throw new ApiError(409, 'This product refund is already being initialized');
      request = claimed;
      let refund: { id: string; status: string };
      try {
        const method = request.refundDestination?.method;
        if (method === 'original_payment') {
          refund = await OrderService.refund(
            String(request.order), request.productRefundAmount ?? 0,
            `Eligible product refund for ${request.requestNumber}`, adminId, `return-refund:${request._id}`
          ) as { id: string; status: string };
        } else if (method === 'wallet') {
          const wallet = await WalletService.credit({
            customerId: String(request.customer),
            amount: request.productRefundAmount ?? 0,
            operationId: `return-refund:${request._id}`,
            sourceType: 'return_refund',
            sourceReference: request.requestNumber,
            description: `Refund for ${request.requestNumber}`,
            createdBy: adminId
          });
          refund = { id: wallet.entryId, status: 'processed' };
        } else if ((method === 'upi' || method === 'bank') && request.refundDestination?.providerFundAccountId) {
          refund = await RazorpayXPayoutService.payout({
            fundAccountId: request.refundDestination.providerFundAccountId,
            method,
            amount: request.productRefundAmount ?? 0,
            idempotencyKey: `return-refund-${request._id}`,
            reference: request.requestNumber
          });
        } else throw new ApiError(409, 'Choose and verify a refund destination before initiating the refund');
      } catch (error) {
        request.refundStatus = 'failed';
        request.status = 'refund_window_open';
        await request.save();
        throw error;
      }
      request.productRefundReference = refund.id;
      const processed = ['processed', 'completed'].includes(refund.status);
      request.refundStatus = processed ? 'processed' : 'pending';
      request.status = processed ? 'refunded' : 'refund_pending';
    } else if (input.action === 'record_manual_upi_refund') {
      const encryptedUpi = request.refundDestination?.encryptedDetails;
      const submittedUpi = encryptedUpi ? RefundDestinationVault.decrypt(encryptedUpi).trim().toLowerCase() : '';
      const recordedUpi = input.upiId?.trim().toLowerCase() ?? '';
      const transactionReference = input.transactionReference?.trim() ?? '';
      if (request.refundDestination?.method !== 'upi' || request.refundDestination.providerValidationId || !submittedUpi) throw new ApiError(409, 'This return is not awaiting a manual UPI transfer');
      if (!recordedUpi || recordedUpi !== submittedUpi) throw new ApiError(409, 'The recorded UPI ID must exactly match the customer-submitted destination');
      if (!transactionReference) throw new ApiError(400, 'Enter the UPI transaction or UTR reference');
      const transferredAt = input.transferredAt ? new Date(input.transferredAt) : new Date();
      if (Number.isNaN(transferredAt.getTime()) || transferredAt.getTime() > Date.now() + 5 * 60_000) throw new ApiError(400, 'Enter a valid transfer date');
      let claimed;
      try {
        claimed = await ReturnRequestModel.findOneAndUpdate(
          { _id: request._id, status: 'refund_window_open', refundStatus: { $in: ['awaiting_destination', 'failed'] }, productRefundReference: { $exists: false } },
          {
            $set: {
              status: 'refunded', refundStatus: 'processed', productRefundReference: transactionReference,
              manualTransferReference: transactionReference, manualTransferredAt: transferredAt, manualTransferRecordedBy: objectId(adminId),
              'refundDestination.verificationStatus': 'verified', 'refundDestination.verifiedAt': new Date()
            }
          },
          { new: true }
        ).select('+refundDestination.encryptedDetails');
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) throw new ApiError(409, 'This UPI transaction reference is already attached to another refund');
        throw error;
      }
      if (!claimed) throw new ApiError(409, 'This manual UPI refund was already recorded or is no longer awaiting transfer');
      request = claimed;
    } else if (input.action === 'refunded') {
      const method = request.refundDestination?.method;
      if (method === 'original_payment') {
        const productRefundReference = request.productRefundReference;
        await OrderService.syncLatestRefund(String(request.order));
        const order = await OrderModel.findById(request.order).select('refunds').lean();
        const refund = order?.refunds.find((candidate) => candidate.providerRefundId === productRefundReference);
        if (!refund || refund.status !== 'processed') throw new ApiError(409, 'Razorpay has not completed this refund yet');
      } else if ((method === 'upi' || method === 'bank') && request.productRefundReference) {
        const payout = await RazorpayXPayoutService.fetchPayout(request.productRefundReference);
        if (!['processed', 'completed'].includes(payout.status)) throw new ApiError(409, `RazorpayX payout is ${payout.status}; it cannot be marked refunded yet`);
      } else throw new ApiError(409, 'This refund method does not have a pending provider refund');
      request.refundStatus = 'processed';
      request.status = 'refunded';
    } else {
      const statusMap: Record<string, typeof request.status> = {
        more_information: 'more_information',
        approved: 'approved',
        rejected: 'rejected',
        warehouse_received: 'warehouse_received',
        quality_check_passed: 'quality_check_passed',
        quality_check_failed: 'quality_check_failed',
        open_refund_window: 'refund_window_open',
        refund_pending: 'refund_pending',
        refunded: 'refunded',
        record_manual_upi_refund: 'refunded',
        closed: 'closed'
      };
      request.status = statusMap[input.action] ?? request.status;
      if (input.action === 'approved') request.eligibility = 'eligible';
      if (input.action === 'rejected') request.eligibility = 'ineligible';
      if (input.action === 'warehouse_received') request.warehouseReceivedAt = new Date();
      if (input.action.startsWith('quality_check')) request.qualityCheckedAt = new Date();
    }
    request.history.push({ action: input.action, note: input.note, admin: objectId(adminId), createdAt: new Date() });
    await request.save();
    const effectiveAction = (input.action === 'refund_pending' && request.status === 'refunded') || input.action === 'record_manual_upi_refund' ? 'refunded' : input.action;
    const returnEvent = effectiveAction === 'approved'
      ? 'return_approved'
      : input.action === 'rejected'
        ? 'return_rejected'
      : input.action === 'create_reverse_pickup'
        ? 'return_pickup_scheduled'
        : input.action === 'warehouse_received'
          ? 'return_received'
          : input.action === 'open_refund_window'
            ? 'return_refund_destination_required'
          : effectiveAction === 'refund_pending'
            ? 'return_refund_initiated'
            : effectiveAction === 'refunded'
              ? 'return_refunded'
          : null;
    if (returnEvent) {
      await LogisticsNotificationService.emit({
        eventType: returnEvent,
        orderId: String(request.order),
        shipmentId: request.reverseShipment ? String(request.reverseShipment) : undefined,
        entityReference: String(request._id),
        dedupeKey: `${returnEvent}:return:${request._id}`
      });
    }
    return returnWithoutEncryptedDestination(request);
  },

  async settleReturnRefund(providerRefundId: string, status: 'processed' | 'failed'): Promise<boolean> {
    if (!providerRefundId) return false;
    const request = await ReturnRequestModel.findOneAndUpdate(
      { productRefundReference: providerRefundId, refundStatus: { $ne: status } },
      { $set: { refundStatus: status, ...(status === 'processed' ? { status: 'refunded' } : {}) }, $push: { history: { action: status === 'processed' ? 'refunded' : 'refund_failed', note: `Razorpay refund ${status}`, createdAt: new Date() } } },
      { new: true }
    );
    if (!request) return false;
    if (status === 'processed') await LogisticsNotificationService.emit({
      eventType: 'return_refunded', orderId: String(request.order), entityReference: String(request._id), dedupeKey: `return_refunded:return:${request._id}`
    });
    return true;
  },

  async actOnExchange(requestId: string, input: { action: string; note?: string }, adminId: string): Promise<unknown> {
    const request = await ExchangeRequestModel.findById(objectId(requestId));
    if (!request) throw new ApiError(404, 'Exchange request not found');
    if (!request.originalItem) throw new ApiError(409, 'Exchange request item data is missing');
    if (input.action === 'approve' && request.status === 'requested') {
      const reserved = await ProductModel.updateOne(
        { _id: request.originalItem.product, variants: { $elemMatch: { _id: request.requestedVariant, enabled: { $ne: false }, stock: { $gte: request.originalItem.quantity } } } },
        { $inc: { 'variants.$.stock': -request.originalItem.quantity } }
      );
      if (!reserved.modifiedCount) throw new ApiError(409, 'Requested replacement is no longer in stock');
      request.inventoryReserved = true;
      request.status = 'inventory_reserved';
    } else if (input.action === 'create_reverse_pickup' && request.status === 'inventory_reserved') {
      const shipment = await ensureReverseShipment({
        _id: request._id,
        requestNumber: request.requestNumber,
        order: request.order,
        item: request.originalItem,
        reason: 'Customer exchange'
      }, adminId);
      request.reverseShipment = shipment?._id;
      request.status = 'reverse_pickup';
    } else if (input.action === 'reject' && request.status === 'requested') {
      request.status = 'rejected';
    } else if (input.action === 'warehouse_received' && ['reverse_pickup', 'in_transit'].includes(request.status)) {
      request.status = 'warehouse_received';
    } else if (input.action === 'quality_check_passed' && request.status === 'warehouse_received') {
      request.status = 'replacement_pending';
      request.qualityCheckedAt = new Date();
    } else if (input.action === 'quality_check_failed' && request.status === 'warehouse_received') {
      if (request.inventoryReserved) {
        await ProductModel.updateOne({ _id: request.originalItem.product, 'variants._id': request.requestedVariant }, { $inc: { 'variants.$.stock': request.originalItem.quantity } });
        request.inventoryReserved = false;
      }
      request.status = 'quality_check_failed';
      request.qualityCheckedAt = new Date();
    } else if (input.action === 'replacement_shipped' && request.status === 'replacement_pending') {
      const shipment = await ensureReplacementShipment(request, adminId);
      request.replacementShipment = shipment?._id;
      request.inventoryReserved = false;
      request.status = 'replacement_shipped';
    } else if (input.action === 'complete' && request.status === 'replacement_shipped') {
      request.status = 'completed';
    } else if (input.action === 'close' && ['completed', 'rejected', 'quality_check_failed'].includes(request.status)) {
      request.status = 'closed';
    } else {
      throw new ApiError(409, `Exchange cannot perform ${input.action} from ${request.status}`);
    }
    request.history.push({ action: input.action, note: input.note, admin: objectId(adminId), createdAt: new Date() });
    await request.save();
    const exchangeEvent = input.action === 'approve'
      ? 'exchange_approved'
      : input.action === 'replacement_shipped'
        ? 'replacement_shipped'
        : input.action === 'complete'
          ? 'exchange_completed'
          : null;
    if (exchangeEvent) {
      await LogisticsNotificationService.emit({
        eventType: exchangeEvent,
        orderId: String(request.order),
        shipmentId: request.replacementShipment ? String(request.replacementShipment) : undefined,
        entityReference: String(request._id),
        dedupeKey: `${exchangeEvent}:exchange:${request._id}`
      });
    }
    return request;
  }
};
