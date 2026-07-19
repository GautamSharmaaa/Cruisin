// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from './payment-status';

describe('order payment status presentation', () => {
  it('does not confirm online orders before verified settlement', () => {
    expect(isOrderPaymentConfirmed({ paymentMode: 'online', paymentStatus: 'pending' })).toBe(false);
    expect(isOrderPaymentConfirmed({ paymentMode: 'online', paymentStatus: 'authorized' })).toBe(false);
  });

  it('confirms verified online, partial, and COD outcomes', () => {
    expect(isOrderPaymentConfirmed({ paymentMode: 'online', paymentStatus: 'paid' })).toBe(true);
    expect(isOrderPaymentConfirmed({ paymentMode: 'partial', paymentStatus: 'partially_paid' })).toBe(true);
    expect(isOrderPaymentConfirmed({ paymentMode: 'cod', paymentStatus: 'cod_pending' })).toBe(true);
  });

  it('recognizes terminal payment failures', () => {
    expect(isOrderPaymentFailed({ paymentStatus: 'failed' })).toBe(true);
    expect(isOrderPaymentFailed({ paymentStatus: 'cancelled' })).toBe(true);
    expect(isOrderPaymentFailed({ paymentStatus: 'pending' })).toBe(false);
  });
});
