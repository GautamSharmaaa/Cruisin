// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { PaymentMethod } from '../types/payment.types.js';

const rawBody = (body: unknown): Buffer => {
  if (Buffer.isBuffer(body)) return body;
  throw new ApiError(400, 'Webhook body must be raw');
};

export const PaymentController = {
  stripeWebhook: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = typeof req.headers['stripe-signature'] === 'string' ? req.headers['stripe-signature'] : '';
    const event = PaymentService.stripeWebhook(rawBody(req.body), signature);
    if (event.type === 'payment_intent.succeeded') {
      await OrderService.markPaymentStatus(event.data.object.id, 'paid');
    }
    if (event.type === 'payment_intent.payment_failed') {
      await OrderService.markPaymentStatus(event.data.object.id, 'failed');
    }
    res.json(new ApiResponse({ received: true }, 'Stripe webhook processed'));
  }),

  razorpayWebhook: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = typeof req.headers['x-razorpay-signature'] === 'string' ? req.headers['x-razorpay-signature'] : '';
    const body = rawBody(req.body);
    const verified = PaymentService.verifyRazorpayWebhook(body, signature);
    if (!verified) throw new ApiError(401, 'Invalid Razorpay signature');
    const event = JSON.parse(body.toString('utf8')) as { event?: string; payload?: { payment?: { entity?: { order_id?: string } } } };
    const orderId = event.payload?.payment?.entity?.order_id;
    if (event.event === 'payment.captured' && orderId) await OrderService.markPaymentStatus(orderId, 'paid');
    if (event.event === 'payment.failed' && orderId) await OrderService.markPaymentStatus(orderId, 'failed');
    res.json(new ApiResponse({ received: true }, 'Razorpay webhook processed'));
  }),

  refund: asyncHandler(async (req: Request<Record<string, string>, unknown, { method: PaymentMethod; paymentId: string; amount: number }>, res: Response): Promise<void> => {
    const refund = await OrderService.refund(req.body.method, req.body.paymentId, req.body.amount);
    res.status(201).json(new ApiResponse(refund, 'Refund created'));
  })
};
