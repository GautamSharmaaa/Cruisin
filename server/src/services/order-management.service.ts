// Governed by .rules v1.0
import mongoose, { Types, type ClientSession } from 'mongoose';
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { LogisticsAuditModel } from '../models/logistics-audit.model.js';
import { LogisticsJobModel } from '../models/logistics-job.model.js';
import { LogisticsNotificationEventModel } from '../models/logistics-notification-event.model.js';
import { LogisticsQuoteModel } from '../models/logistics-quote.model.js';
import { LogisticsWebhookEventModel } from '../models/logistics-webhook-event.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { OrderDeleteTombstoneModel } from '../models/order-delete-tombstone.model.js';
import { OrderModel } from '../models/order.model.js';
import { PaymentWebhookEventModel } from '../models/payment-webhook-event.model.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { ApiError } from '../utils/api-error.js';

export type DeleteClassification = 'SAFE_TEST_ORDER' | 'REAL_ORDER_ARCHIVE_ONLY' | 'UNSAFE_TO_DELETE';
export interface DeleteEligibility {
  eligible: boolean;
  classification: DeleteClassification;
  blockers: string[];
  relatedRecordCounts: Record<string, number>;
}

const objectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw new ApiError(400, 'Invalid identifier');
  return new Types.ObjectId(value);
};
const explicitTestOrder = (order: { isTestOrder?: boolean; isAnalyticsTestData?: boolean }): boolean => order.isTestOrder === true || order.isAnalyticsTestData === true;

const eligibilityFor = async (id: string, session?: ClientSession): Promise<{ result: DeleteEligibility; orderNumber: string; shipmentIds: Types.ObjectId[]; notificationDedupeKeys: string[] }> => {
  const orderId = objectId(id);
  const order = await OrderModel.findById(orderId).select('orderNumber isTestOrder isAnalyticsTestData paymentStatus paymentMode paymentProvider amountPaid amountDue stockReserved razorpayOrderId razorpayPaymentId stripePaymentIntentId paymentAttempts refunds trackingNumber logisticsQuoteId').session(session ?? null).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  const shipments = await ShipmentModel.find({ order: orderId }).select('_id awb providerOrderId providerShipmentId pickupDate shipmentStatus returnStatus exchangeStatus').session(session ?? null).lean();
  const shipmentIds = shipments.map((shipment) => shipment._id);
  const jobFilter = { $or: [{ 'payload.orderId': id }, { 'payload.shipmentId': { $in: shipmentIds.map(String) } }] };
  const [quotes, jobs, notificationEvents, webhookEvents, paymentWebhookEvents, returns, exchanges, audits] = await Promise.all([
    order.logisticsQuoteId ? LogisticsQuoteModel.countDocuments({ quoteId: order.logisticsQuoteId }).session(session ?? null) : 0,
    LogisticsJobModel.countDocuments(jobFilter).session(session ?? null),
    LogisticsNotificationEventModel.find({ order: orderId }).select('dedupeKey').session(session ?? null).lean(),
    shipmentIds.length ? LogisticsWebhookEventModel.countDocuments({ shipment: { $in: shipmentIds } }).session(session ?? null) : 0,
    PaymentWebhookEventModel.countDocuments({ order: orderId }).session(session ?? null),
    ReturnRequestModel.find({ order: orderId }).select('status refundStatus').session(session ?? null).lean(),
    ExchangeRequestModel.find({ order: orderId }).select('status inventoryReserved additionalAmount refundDifference').session(session ?? null).lean(),
    LogisticsAuditModel.countDocuments({ order: orderId }).session(session ?? null)
  ]);
  const relatedRecordCounts = {
    shipments: shipments.length,
    quotes,
    jobs,
    notifications: notificationEvents.length,
    webhooks: webhookEvents,
    paymentWebhooks: paymentWebhookEvents,
    returns: returns.length,
    exchanges: exchanges.length,
    audits
  };
  const blockers: string[] = [];
  const testOrder = explicitTestOrder(order);
  if (!testOrder) blockers.push('Order is not explicitly marked as a test order');
  if (!['pending', 'failed', 'cancelled'].includes(order.paymentStatus)) blockers.push('Payment state is not an unambiguously unpaid test state');
  if ((order.amountPaid ?? 0) > 0 || ['authorized', 'paid', 'partially_paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus)) blockers.push('Captured or settled payment state exists');
  if (order.paymentMode === 'cod' && ((order.amountPaid ?? 0) > 0 || order.paymentStatus === 'paid')) blockers.push('COD settlement exists');
  if (order.razorpayPaymentId || order.razorpayOrderId || order.stripePaymentIntentId) blockers.push('Payment provider reference exists');
  if (order.paymentAttempts.some((attempt) => ['authorized', 'captured', 'paid'].includes(attempt.status))) blockers.push('Captured payment attempt exists');
  if (order.refunds.length > 0) blockers.push('Refund history exists');
  if (paymentWebhookEvents > 0) blockers.push('Payment webhook history exists');
  if (order.stockReserved) blockers.push('Inventory reconciliation is incomplete');
  if (order.trackingNumber) blockers.push('Order tracking reference exists');
  if (shipments.some((shipment) => shipment.awb || shipment.providerOrderId || shipment.providerShipmentId)) blockers.push('Shiprocket provider reference exists');
  if (shipments.some((shipment) => shipment.pickupDate || !['draft', 'pending_provider'].includes(shipment.shipmentStatus))) blockers.push('Shipment has real-world or uncertain fulfilment state');
  if (webhookEvents > 0) blockers.push('Shiprocket webhook history exists');
  if (returns.some((request) => !['rejected', 'closed'].includes(request.status) || request.refundStatus !== 'not_started')) blockers.push('Active return state exists');
  if (exchanges.some((request) => !['rejected', 'closed'].includes(request.status) || request.inventoryReserved || request.additionalAmount > 0 || request.refundDifference > 0)) blockers.push('Active exchange state exists');
  const uniqueBlockers = [...new Set(blockers)];
  const dangerous = uniqueBlockers.some((blocker) => blocker !== 'Order is not explicitly marked as a test order');
  const classification: DeleteClassification = testOrder && uniqueBlockers.length === 0
    ? 'SAFE_TEST_ORDER'
    : !testOrder && !dangerous
      ? 'REAL_ORDER_ARCHIVE_ONLY'
      : 'UNSAFE_TO_DELETE';
  return {
    result: { eligible: classification === 'SAFE_TEST_ORDER', classification, blockers: uniqueBlockers, relatedRecordCounts },
    orderNumber: order.orderNumber ?? String(order._id),
    shipmentIds,
    notificationDedupeKeys: notificationEvents.map((event) => event.dedupeKey)
  };
};

export const OrderManagementService = {
  async archive(id: string, adminId: string, reason?: string): Promise<unknown> {
    const order = await OrderModel.findOneAndUpdate(
      { _id: objectId(id), archivedAt: { $exists: false } },
      { $set: { archivedAt: new Date(), archivedBy: objectId(adminId), archiveReason: reason?.trim() || undefined } },
      { new: true }
    );
    if (order) return order;
    const existing = await OrderModel.findById(id);
    if (!existing) throw new ApiError(404, 'Order not found');
    return existing;
  },

  async restore(id: string): Promise<unknown> {
    const order = await OrderModel.findByIdAndUpdate(objectId(id), { $unset: { archivedAt: 1, archivedBy: 1, archiveReason: 1 } }, { new: true });
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  },

  async deleteEligibility(id: string): Promise<DeleteEligibility> {
    return (await eligibilityFor(id)).result;
  },

  async permanentlyDelete(id: string, adminId: string, input: { orderNumber: string; reason: string }): Promise<{ deleted: true; tombstoneId: string }> {
    const eligibility = await eligibilityFor(id);
    if (!eligibility.result.eligible) throw new ApiError(409, 'This order cannot be permanently deleted. Archive this order instead.');
    if (input.orderNumber.trim() !== eligibility.orderNumber) throw new ApiError(400, 'Typed order number does not match');
    const session = await mongoose.startSession();
    let tombstoneId = '';
    try {
      await session.withTransaction(async () => {
        const fresh = await eligibilityFor(id, session);
        if (!fresh.result.eligible || fresh.orderNumber !== eligibility.orderNumber) throw new ApiError(409, 'Order safety state changed; run delete eligibility again');
        const orderId = objectId(id);
        const removed: Record<string, number> = {};
        const operation = async (name: string, promise: Promise<{ deletedCount: number }>): Promise<void> => {
          removed[name] = (await promise).deletedCount;
        };
        await operation('notifications', NotificationModel.deleteMany({ 'metadata.dedupeKey': { $in: fresh.notificationDedupeKeys } }, { session }));
        await operation('logisticsNotificationEvents', LogisticsNotificationEventModel.deleteMany({ order: orderId }, { session }));
        await operation('logisticsJobs', LogisticsJobModel.deleteMany({ $or: [{ 'payload.orderId': id }, { 'payload.shipmentId': { $in: fresh.shipmentIds.map(String) } }] }, { session }));
        await operation('logisticsAudits', LogisticsAuditModel.deleteMany({ order: orderId }, { session }));
        await operation('returns', ReturnRequestModel.deleteMany({ order: orderId }, { session }));
        await operation('exchanges', ExchangeRequestModel.deleteMany({ order: orderId }, { session }));
        if (fresh.shipmentIds.length) await operation('shipmentDrafts', ShipmentModel.deleteMany({ _id: { $in: fresh.shipmentIds }, awb: { $exists: false }, providerOrderId: { $exists: false }, providerShipmentId: { $exists: false }, shipmentStatus: { $in: ['draft', 'pending_provider', 'error'] } }, { session }));
        if (fresh.result.relatedRecordCounts.quotes > 0) {
          const order = await OrderModel.findById(orderId).select('logisticsQuoteId').session(session).lean();
          if (order?.logisticsQuoteId) await operation('quotes', LogisticsQuoteModel.deleteMany({ quoteId: order.logisticsQuoteId }, { session }));
        }
        const deletedOrder = await OrderModel.deleteOne({ _id: orderId, $or: [{ isTestOrder: true }, { isAnalyticsTestData: true }] }, { session });
        if (deletedOrder.deletedCount !== 1) throw new ApiError(409, 'Test-order classification changed; deletion stopped');
        removed.order = 1;
        const tombstone = await OrderDeleteTombstoneModel.create([{
          orderNumber: fresh.orderNumber,
          deletedAt: new Date(),
          deletedBy: objectId(adminId),
          reason: input.reason.trim(),
          wasTestOrder: true,
          relatedRecordsRemoved: removed
        }], { session });
        tombstoneId = String(tombstone[0]?._id ?? '');
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(409, 'Permanent deletion requires a supported MongoDB transaction and was not completed');
    } finally {
      await session.endSession();
    }
    if (!tombstoneId) throw new ApiError(409, 'Permanent deletion was not completed');
    return { deleted: true, tombstoneId };
  }
};
