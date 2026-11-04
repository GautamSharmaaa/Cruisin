// Provider-neutral boundary. No Fasterr protocol is assumed until official
// merchant integration documentation and sandbox credentials are supplied.
export interface CheckoutSessionRequest {
  checkoutIntentId: string;
  reservationId: string;
  customerId: string;
  amountPaise: number;
  currency: 'INR';
  idempotencyKey: string;
  expiresAt: Date;
}

export interface CheckoutSession {
  provider: 'fastrr';
  providerSessionId: string;
  checkoutIntentId: string;
  expiresAt: Date;
}

export interface VerifiedCheckoutEvent {
  providerEventId: string;
  providerSessionId: string;
  checkoutIntentId: string;
  paymentReference?: string;
  amountPaise: number;
  currency: 'INR';
  state: 'paid' | 'cod_confirmed' | 'failed' | 'expired';
}

export interface CheckoutProvider {
  createSession(request: CheckoutSessionRequest): Promise<CheckoutSession>;
  verifyEvent(rawBody: Buffer, headers: Readonly<Record<string, string>>): Promise<VerifiedCheckoutEvent>;
}

export const fastrrCheckoutProvider: CheckoutProvider = {
  createSession: async () => { throw new Error('Fastrr sandbox integration is not configured'); },
  verifyEvent: async () => { throw new Error('Fastrr webhook protocol is not configured'); }
};
