import { describe, expect, it } from 'vitest';
import { checkoutPaymentSessionIssue } from './checkout-payment';

describe('checkoutPaymentSessionIssue', () => {
  it('blocks a stale provider order before Razorpay opens', () => {
    expect(checkoutPaymentSessionIssue({
      order: { total: 8_497 },
      payment: { amount: 8_497, currency: 'INR' },
      amountToPay: 8_497
    }, 2, 'online')).toContain('bag total changed');
  });

  it('accepts an exact online checkout amount', () => {
    expect(checkoutPaymentSessionIssue({
      order: { total: 2 },
      payment: { amount: 2, currency: 'INR' },
      amountToPay: 2
    }, 2, 'online')).toBeNull();
  });

  it('allows a bounded partial payment and rejects an excessive one', () => {
    expect(checkoutPaymentSessionIssue({ order: { total: 3_000 }, payment: { amount: 500, currency: 'INR' }, amountToPay: 500 }, 3_000, 'partial')).toBeNull();
    expect(checkoutPaymentSessionIssue({ order: { total: 3_000 }, payment: { amount: 3_001, currency: 'INR' }, amountToPay: 3_001 }, 3_000, 'partial')).toContain('exceeds');
  });
});
