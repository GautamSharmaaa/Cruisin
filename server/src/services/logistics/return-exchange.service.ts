// Governed by .rules v1.0
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { logisticsConfig } from '../../config/logistics.js';
import { ExchangeRequestModel } from '../../models/exchange-request.model.js';
import { OrderModel } from '../../models/order.model.js';
import { ProductModel } from '../../models/product.model.js';
import { ReturnRequestModel } from '../../models/return-request.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import { UserModel } from '../../models/user.model.js';
import { ApiError } from '../../utils/api-error.js';
import { calculatePackage } from './package-calculator.js';
import { getLogisticsProvider } from './provider-factory.js';
import { LogisticsNotificationService } from './logistics-notification.service.js';

const requestNumber = (prefix: string): string => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const objectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw new ApiError(400, 'Invalid identifier');
  return new Types.ObjectId(value);
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

const orderItem = (order: { items: Array<{ product: unknown; variant: unknown; sku: string; title: string; price: number; quantity: number }> }, variantId: string) => {
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
  const order = await OrderModel.findOne({ _id: objectId(orderId), user: objectId(customerId) });
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
  reason: string;
  reverseShipment?: unknown;
}, adminId: string) => {
  if (request.reverseShipment) return ShipmentModel.findById(request.reverseShipment);
  if (!request.item) throw new ApiError(409, 'Return request item data is missing');
  const order = await OrderModel.findById(request.order);
  if (!order) throw new ApiError(404, 'Order not found');
  const item = orderItem(order, String(request.item.variant));
  const { product, variant } = await loadProductVariant(request.item.product, request.item.variant);
  const parcel = await calculatePackage([{ product, variant, quantity: request.item.quantity }]);
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
      items: [{ name: item.title, sku: item.sku, units: request.item.quantity, sellingPrice: item.price, discount: 0, tax: 0 }],
      paymentMode: 'prepaid',
      subtotal: item.price * request.item.quantity,
      shippingCharge: 0,
      totalDiscount: 0,
      total: item.price * request.item.quantity,
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

export const ReturnExchangeService = {
  async createReturn(customerId: string, input: { orderId: string; variantId: string; quantity: number; reason: string; details?: string; idempotencyKey: string }): Promise<unknown> {
    const existing = await ReturnRequestModel.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return existing;
    const order = await assertDeliveredOrder(input.orderId, customerId);
    const item = orderItem(order, input.variantId);
    if (input.quantity > item.quantity) throw new ApiError(400, 'Return quantity exceeds the purchased quantity');
    return ReturnRequestModel.create({
      requestNumber: requestNumber('RET'),
      order: order._id,
      customer: objectId(customerId),
      item: { product: item.product, variant: item.variant, sku: item.sku, quantity: input.quantity },
      reason: input.reason,
      details: input.details,
      idempotencyKey: input.idempotencyKey,
      history: [{ action: 'requested', note: input.details }]
    });
  },

  async createExchange(customerId: string, input: { orderId: string; variantId: string; requestedVariantId: string; quantity: number; idempotencyKey: string }): Promise<unknown> {
    const existing = await ExchangeRequestModel.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return existing;
    const order = await assertDeliveredOrder(input.orderId, customerId);
    const item = orderItem(order, input.variantId);
    if (input.quantity > item.quantity) throw new ApiError(400, 'Exchange quantity exceeds the purchased quantity');
    const { product, variant } = await loadProductVariant(item.product, input.requestedVariantId);
    if (variant.stock < input.quantity || variant.enabled === false) throw new ApiError(409, 'Requested replacement is out of stock');
    return ExchangeRequestModel.create({
      requestNumber: requestNumber('EXC'),
      order: order._id,
      customer: objectId(customerId),
      originalItem: { product: item.product, variant: item.variant, sku: item.sku, quantity: input.quantity },
      requestedVariant: variant._id,
      requestedSku: variant.sku,
      additionalAmount: Math.max(0, (variant.priceOverride ?? variant.price) - item.price) * input.quantity,
      refundDifference: Math.max(0, item.price - (variant.priceOverride ?? variant.price)) * input.quantity,
      idempotencyKey: input.idempotencyKey,
      history: [{ action: 'requested', note: `Requested ${product.title} / ${variant.sku}` }]
    });
  },

  async mine(customerId: string): Promise<unknown> {
    const [returns, exchanges] = await Promise.all([
      ReturnRequestModel.find({ customer: objectId(customerId) }).sort({ createdAt: -1 }).lean(),
      ExchangeRequestModel.find({ customer: objectId(customerId) }).sort({ createdAt: -1 }).lean()
    ]);
    return { returns, exchanges };
  },

  async listReturns(): Promise<unknown> {
    return ReturnRequestModel.find().populate('order').sort({ createdAt: -1 }).limit(500).lean();
  },

  async listExchanges(): Promise<unknown> {
    return ExchangeRequestModel.find().populate('order').sort({ createdAt: -1 }).limit(500).lean();
  },

  async actOnReturn(requestId: string, input: { action: string; note?: string }, adminId: string): Promise<unknown> {
    const request = await ReturnRequestModel.findById(objectId(requestId));
    if (!request) throw new ApiError(404, 'Return request not found');
    const transitions: Record<string, string[]> = {
      requested: ['more_information', 'approved', 'rejected'],
      more_information: ['approved', 'rejected'],
      approved: ['create_reverse_pickup'],
      reverse_pickup: ['warehouse_received'],
      in_transit: ['warehouse_received'],
      warehouse_received: ['quality_check_passed', 'quality_check_failed'],
      quality_check_passed: ['refund_pending'],
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
    } else {
      const statusMap: Record<string, typeof request.status> = {
        more_information: 'more_information',
        approved: 'approved',
        rejected: 'rejected',
        warehouse_received: 'warehouse_received',
        quality_check_passed: 'quality_check_passed',
        quality_check_failed: 'quality_check_failed',
        refund_pending: 'refund_pending',
        refunded: 'refunded',
        closed: 'closed'
      };
      request.status = statusMap[input.action] ?? request.status;
      if (input.action === 'approved') request.eligibility = 'eligible';
      if (input.action === 'rejected') request.eligibility = 'ineligible';
      if (input.action === 'warehouse_received') request.warehouseReceivedAt = new Date();
      if (input.action.startsWith('quality_check')) request.qualityCheckedAt = new Date();
      if (input.action === 'refund_pending') request.refundStatus = 'pending';
      if (input.action === 'refunded') request.refundStatus = 'processed';
    }
    request.history.push({ action: input.action, note: input.note, admin: objectId(adminId), createdAt: new Date() });
    await request.save();
    const returnEvent = input.action === 'approved'
      ? 'return_approved'
      : input.action === 'create_reverse_pickup'
        ? 'return_pickup_scheduled'
        : input.action === 'warehouse_received'
          ? 'return_received'
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
    return request;
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
