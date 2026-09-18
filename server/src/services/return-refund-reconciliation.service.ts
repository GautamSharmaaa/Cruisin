// Governed by .rules v1.0
import { Types } from 'mongoose';
import { OrderModel } from '../models/order.model.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { ApiError } from '../utils/api-error.js';

type OrderRefund = {
  providerRefundId?: string | null;
  idempotencyKey?: string | null;
  amount: number;
  status: string;
  reason?: string | null;
  requestedBy?: Types.ObjectId | null;
  createdAt?: Date | null;
};

const cents = (value: number): number => Math.round(Number(value) * 100);
const activeRefundStatuses = ['refund_window_open', 'refund_pending'] as const;
const committedProviderStatuses = new Set(['created', 'pending', 'processed']);

export interface ReturnRefundReconciliationResult {
  matched: Array<{ requestId: string; requestNumber: string; providerRefundId: string; status: string }>;
  unresolved: string[];
}

export const ReturnRefundReconciliationService = {
  async reconcileOrder(orderId: string, onlyRequestId?: string): Promise<ReturnRefundReconciliationResult> {
    if (!Types.ObjectId.isValid(orderId)) throw new ApiError(400, 'Invalid order identifier');
    if (onlyRequestId && !Types.ObjectId.isValid(onlyRequestId)) throw new ApiError(400, 'Invalid return request identifier');
    const order = await OrderModel.findById(orderId).select('paymentProvider razorpayPaymentId refunds').lean();
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentProvider !== 'razorpay' || !order.razorpayPaymentId) return { matched: [], unresolved: [] };

    const allRequests = await ReturnRequestModel.find({ order: order._id }).select('_id requestNumber status refundStatus productRefundAmount productRefundReference').lean();
    const linkedRefundIds = new Set(allRequests.map((request) => request.productRefundReference).filter((value): value is string => Boolean(value)));
    const candidateRequests = allRequests.filter((request) =>
      activeRefundStatuses.includes(request.status as (typeof activeRefundStatuses)[number])
      && !request.productRefundReference
    );
    const requests = candidateRequests.filter((request) => !onlyRequestId || String(request._id) === onlyRequestId);
    const refunds = (order.refunds as OrderRefund[]).filter((refund) =>
      Boolean(refund.providerRefundId)
      && committedProviderStatuses.has(refund.status)
      && !linkedRefundIds.has(String(refund.providerRefundId))
    );
    const assignments = new Map<string, OrderRefund>();
    const usedRefundIds = new Set<string>();

    for (const request of candidateRequests) {
      const direct = refunds.find((refund) => refund.idempotencyKey === `return-refund:${request._id}`);
      if (direct?.providerRefundId) {
        assignments.set(String(request._id), direct);
        usedRefundIds.add(direct.providerRefundId);
      }
    }

    const unmatchedRequests = candidateRequests.filter((request) => !assignments.has(String(request._id)));
    const unmatchedRefunds = refunds.filter((refund) => !usedRefundIds.has(String(refund.providerRefundId)));
    const amounts = new Set(requests.filter((request) => !assignments.has(String(request._id))).map((request) => cents(request.productRefundAmount ?? 0)));
    for (const amount of amounts) {
      const amountRequests = unmatchedRequests.filter((request) => cents(request.productRefundAmount ?? 0) === amount);
      const amountRefunds = unmatchedRefunds.filter((refund) => cents(refund.amount) === amount);
      if (amountRequests.length === 1 && amountRefunds.length === 1) assignments.set(String(amountRequests[0]!._id), amountRefunds[0]!);
    }

    const matched: ReturnRefundReconciliationResult['matched'] = [];
    for (const request of requests) {
      const refund = assignments.get(String(request._id));
      if (!refund?.providerRefundId) continue;
      const processed = refund.status === 'processed';
      const recordedAt = refund.createdAt ?? new Date();
      const updated = await ReturnRequestModel.findOneAndUpdate(
        {
          _id: request._id,
          order: order._id,
          status: { $in: activeRefundStatuses },
          productRefundReference: { $in: [null, ''] }
        },
        {
          $set: {
            status: processed ? 'refunded' : 'refund_pending',
            refundStatus: processed ? 'processed' : 'pending',
            productRefundReference: refund.providerRefundId,
            refundDestination: {
              method: 'original_payment',
              verificationStatus: 'verified',
              maskedDetails: 'Original Razorpay payment method',
              ...(refund.requestedBy ? { submittedBy: refund.requestedBy, submittedByRole: 'admin' } : {}),
              submittedAt: recordedAt,
              verifiedAt: recordedAt
            }
          },
          $push: {
            history: {
              action: processed ? 'refund_reconciled' : 'refund_reconciliation_pending',
              note: `Linked Razorpay refund ${refund.providerRefundId} created from order payment operations`,
              ...(refund.requestedBy ? { admin: refund.requestedBy } : {}),
              createdAt: new Date()
            }
          }
        },
        { new: true }
      ).lean();
      if (updated) matched.push({ requestId: String(updated._id), requestNumber: updated.requestNumber, providerRefundId: refund.providerRefundId, status: updated.refundStatus });
    }

    return {
      matched,
      unresolved: requests.filter((request) => !matched.some((entry) => entry.requestId === String(request._id))).map((request) => request.requestNumber)
    };
  }
};
