// Governed by .rules v1.0
import crypto from 'node:crypto';
import axios from 'axios';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { PaymentMethod, PaymentOrder, PaymentProvider, Refund } from '../types/payment.types.js';

export const toPaise = (amount: number): number => {
  const paise = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(paise) || paise < 100) throw new ApiError(400, 'Invalid payment amount');
  return paise;
};

const localPaymentId = (prefix: string): string => `${prefix}_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
const usesLocalPaymentKeys = (provider: PaymentMethod): boolean => env.APP_ENV === 'development' && (
  provider === 'razorpay'
    ? env.RAZORPAY_KEY_ID.includes('mock') || env.RAZORPAY_KEY_SECRET.includes('mock')
    : provider === 'stripe' && env.STRIPE_SECRET_KEY.includes('mock')
);

class LocalPaymentProvider implements PaymentProvider {
  public constructor(private readonly provider: PaymentMethod) {}

  public async createOrder(amount: number, currency: string, _metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const id = this.provider === 'razorpay' ? localPaymentId('order') : localPaymentId('pi');
    return {
      id,
      amount,
      currency,
      clientSecret: this.provider === 'stripe' ? `${id}_secret_local` : undefined,
      provider: this.provider
    };
  }

  public async verifyPayment(payload: Record<string, unknown>): Promise<boolean> {
    const mockVerified = payload.mockVerified;
    return mockVerified === true || mockVerified === 'true';
  }

  public async createRefund(_paymentId: string, amount: number, _idempotencyKey: string): Promise<Refund> {
    return { id: localPaymentId('refund'), amount, status: 'processed' };
  }
}

export class RazorpayProvider implements PaymentProvider {
  private readonly client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

  public async createOrder(amount: number, currency: string, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const notes = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, typeof value === 'number' ? value : String(value)]));
    try {
      const order = await this.client.orders.create({ amount: toPaise(amount), currency, notes }) as unknown as { id: string };
      return { id: order.id, amount, currency, provider: 'razorpay' };
    } catch {
      throw new ApiError(502, 'Payment provider unavailable');
    }
  }

  public async verifyPayment(payload: Record<string, unknown>): Promise<boolean> {
    const orderId = typeof payload.razorpay_order_id === 'string' ? payload.razorpay_order_id : '';
    const paymentId = typeof payload.razorpay_payment_id === 'string' ? payload.razorpay_payment_id : '';
    const signature = typeof payload.razorpay_signature === 'string' ? payload.razorpay_signature : '';
    const digest = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(orderId + '|' + paymentId).digest('hex');
    return signature.length > 0 && digest.length === signature.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  public async createRefund(paymentId: string, amount: number, idempotencyKey: string, metadata: Record<string, unknown> = {}): Promise<Refund> {
    try {
      const auth = { username: env.RAZORPAY_KEY_ID, password: env.RAZORPAY_KEY_SECRET };
      const requestedAmount = toPaise(amount);
      const paymentResponse = await axios.get(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { auth }
      );
      const payment = paymentResponse.data as { amount?: unknown; amount_refunded?: unknown };
      const capturedAmount = Number(payment.amount);
      const refundedAmount = Number(payment.amount_refunded ?? 0);
      const remainingAmount = capturedAmount - refundedAmount;
      if (!Number.isSafeInteger(remainingAmount) || remainingAmount <= 0 || requestedAmount > remainingAmount) throw new ApiError(400, 'Refund exceeds provider refundable balance');
      const requestBody: Record<string, unknown> = {
        receipt: idempotencyKey,
        notes: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value).slice(0, 256)]))
      };
      if (requestedAmount < remainingAmount) requestBody.amount = requestedAmount;
      const response = await axios.post(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
        requestBody,
        {
          auth,
          headers: { 'Content-Type': 'application/json', 'X-Refund-Idempotency': idempotencyKey }
        }
      );
      const refund = response.data as { id: string; status: string };
      return { id: refund.id, amount, status: String(refund.status) };
    } catch (error: unknown) {
      const providerError = axios.isAxiosError(error) && typeof error.response?.data === 'object' && error.response.data !== null && 'error' in error.response.data
        ? (error.response.data as { error?: { description?: unknown } }).error
        : undefined;
      const description = typeof providerError?.description === 'string' ? providerError.description : '';
      const statusCode = axios.isAxiosError(error) && error.response?.status === 400 ? 400 : 502;
      if (error instanceof ApiError) throw error;
      throw new ApiError(statusCode, description || 'Refund provider unavailable');
    }
  }
}

export class StripeProvider implements PaymentProvider {
  private readonly client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

  public async createOrder(amount: number, currency: string, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    try {
      const intent = await this.client.paymentIntents.create({ amount: Math.round(amount * 100), currency: currency.toLowerCase(), metadata: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])) });
      return { id: intent.id, amount, currency, clientSecret: intent.client_secret ?? undefined, provider: 'stripe' };
    } catch {
      throw new ApiError(502, 'Payment provider unavailable');
    }
  }

  public async verifyPayment(payload: Record<string, unknown>): Promise<boolean> {
    const paymentIntentId = typeof payload.paymentIntentId === 'string' ? payload.paymentIntentId : '';
    if (paymentIntentId.length === 0) {
      return false;
    }
    const intent = await this.client.paymentIntents.retrieve(paymentIntentId);
    return intent.status === 'succeeded';
  }

  public async createRefund(paymentId: string, amount: number, idempotencyKey: string): Promise<Refund> {
    const refund = await this.client.refunds.create({ payment_intent: paymentId, amount: Math.round(amount * 100) }, { idempotencyKey });
    return { id: refund.id, amount, status: refund.status ?? 'pending' };
  }
}

export class PaymentService {
  public static getProvider(method: PaymentMethod): PaymentProvider {
    if (usesLocalPaymentKeys(method)) {
      return new LocalPaymentProvider(method);
    }
    if (method === 'razorpay') {
      return new RazorpayProvider();
    }
    if (method === 'stripe') {
      return new StripeProvider();
    }
    throw new ApiError(400, 'Unsupported payment provider');
  }

  public static verifyRazorpayWebhook(rawBody: Buffer, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
    const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return signature.length > 0 && expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  public static stripeWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  }

  public static async refund(method: PaymentMethod, paymentId: string, amount: number, idempotencyKey: string, metadata?: Record<string, unknown>): Promise<Refund> {
    return this.getProvider(method).createRefund(paymentId, amount, idempotencyKey, metadata);
  }
}
