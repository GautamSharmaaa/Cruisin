// Governed by .rules v1.0
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
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
  config: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse({
      paymentMode: env.PAYMENT_MODE,
      codEnabled: env.COD_ENABLED && env.COD_CHECKOUT_ENABLED,
      partialPaymentEnabled: env.PARTIAL_PAYMENT_ENABLED,
      partialPaymentPercentage: env.PARTIAL_PAYMENT_PERCENTAGE ?? null,
      partialPaymentFixedAmount: env.PARTIAL_PAYMENT_FIXED_AMOUNT ?? null,
      minPartialPaymentOrderValue: env.MIN_PARTIAL_PAYMENT_ORDER_VALUE,
      maxCodOrderValue: env.MAX_COD_ORDER_VALUE
    }, 'Payment configuration loaded'));
  }),
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
    const event = JSON.parse(body.toString('utf8')) as { id?: string; event?: string; payload?: Record<string, unknown> };
    if (!event.event || !event.payload) throw new ApiError(400, 'Invalid Razorpay webhook event');
    const headerEventId = typeof req.headers['x-razorpay-event-id'] === 'string' ? req.headers['x-razorpay-event-id'] : '';
    const eventId = headerEventId || event.id || crypto.createHash('sha256').update(body).digest('hex');
    const processed = await OrderService.processRazorpayWebhook(eventId, event.event, event.payload);
    res.json(new ApiResponse({ received: true, processed }, processed ? 'Razorpay webhook processed' : 'Duplicate Razorpay webhook ignored'));
  }),

  refund: asyncHandler(async (req: Request<Record<string, string>, unknown, { amount: number; reason?: string; idempotencyKey: string }>, res: Response): Promise<void> => {
    const refund = await OrderService.refund(String(req.params.id ?? ''), req.body.amount, req.body.reason, req.user?.userId ?? '', req.body.idempotencyKey);
    res.status(201).json(new ApiResponse(refund, 'Refund created'));
  })
};
