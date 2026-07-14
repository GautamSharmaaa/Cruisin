// Governed by .rules v1.0
export type PaymentMethod = 'razorpay' | 'stripe' | 'cod';
export type CheckoutPaymentMode = 'online' | 'cod' | 'partial';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  provider: PaymentMethod;
}

export interface Refund {
  id: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  createOrder(amount: number, currency: string, metadata: Record<string, unknown>): Promise<PaymentOrder>;
  verifyPayment(payload: Record<string, unknown>): Promise<boolean>;
  createRefund(paymentId: string, amount: number, idempotencyKey: string, metadata?: Record<string, unknown>): Promise<Refund>;
}
