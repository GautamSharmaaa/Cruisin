// Governed by .rules v1.0
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { PaymentMethod, PaymentOrder, PaymentProvider, Refund } from '../types/payment.types.js';

export class RazorpayProvider implements PaymentProvider {
  private readonly client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

  public async createOrder(amount: number, currency: string, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const notes = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, typeof value === 'number' ? value : String(value)]));
    const order = await this.client.orders.create({ amount: Math.round(amount * 100), currency, notes }) as unknown as { id: string };
    return { id: order.id, amount, currency, provider: 'razorpay' };
  }

  public async verifyPayment(payload: Record<string, unknown>): Promise<boolean> {
    const orderId = typeof payload.razorpay_order_id === 'string' ? payload.razorpay_order_id : '';
    const paymentId = typeof payload.razorpay_payment_id === 'string' ? payload.razorpay_payment_id : '';
    const signature = typeof payload.razorpay_signature === 'string' ? payload.razorpay_signature : '';
    const digest = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(orderId + '|' + paymentId).digest('hex');
    return signature.length > 0 && digest.length === signature.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  public async createRefund(paymentId: string, amount: number): Promise<Refund> {
    const refund = await this.client.payments.refund(paymentId, { amount: Math.round(amount * 100) });
    return { id: refund.id, amount, status: String(refund.status) };
  }
}

export class StripeProvider implements PaymentProvider {
  private readonly client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

  public async createOrder(amount: number, currency: string, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const intent = await this.client.paymentIntents.create({ amount: Math.round(amount * 100), currency: currency.toLowerCase(), metadata: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])) });
    return { id: intent.id, amount, currency, clientSecret: intent.client_secret ?? undefined, provider: 'stripe' };
  }

  public async verifyPayment(payload: Record<string, unknown>): Promise<boolean> {
    const paymentIntentId = typeof payload.paymentIntentId === 'string' ? payload.paymentIntentId : '';
    if (paymentIntentId.length === 0) {
      return false;
    }
    const intent = await this.client.paymentIntents.retrieve(paymentIntentId);
    return intent.status === 'succeeded';
  }

  public async createRefund(paymentId: string, amount: number): Promise<Refund> {
    const refund = await this.client.refunds.create({ payment_intent: paymentId, amount: Math.round(amount * 100) });
    return { id: refund.id, amount, status: refund.status ?? 'pending' };
  }
}

export class PaymentService {
  public static getProvider(method: PaymentMethod): PaymentProvider {
    if (method === 'razorpay') {
      return new RazorpayProvider();
    }
    if (method === 'stripe') {
      return new StripeProvider();
    }
    throw new ApiError(400, 'Unsupported payment provider');
  }
}
