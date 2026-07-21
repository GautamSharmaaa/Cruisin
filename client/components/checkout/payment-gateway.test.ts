import { describe, expect, it } from 'vitest';
import { partialPaymentAmount, paymentMethodAvailability, type PaymentConfiguration } from '@/lib/payment-availability';

const config: PaymentConfiguration = { paymentMode: 'test', codEnabled: true, partialPaymentEnabled: true, partialPaymentPercentage: 25, partialPaymentFixedAmount: null, minPartialPaymentOrderValue: 1_000, maxCodOrderValue: 5_000 };

describe('paymentMethodAvailability', () => {
  it('disables COD above the configured maximum', () => {
    expect(paymentMethodAvailability(config, 5_001).cod).toEqual({ enabled: false, reason: 'Available up to ₹5,000.' });
  });

  it('disables partial payment below the configured minimum', () => {
    expect(paymentMethodAvailability(config, 999).partial).toEqual({ enabled: false, reason: 'Available from ₹1,000.' });
  });

  it('keeps eligible configured payment methods available', () => {
    expect(paymentMethodAvailability(config, 2_000)).toMatchObject({ cod: { enabled: true }, partial: { enabled: true } });
  });

  it('calculates the exact percentage advance shown before Razorpay opens', () => {
    expect(partialPaymentAmount(config, 2_000)).toBe(500);
    expect(partialPaymentAmount(config, 11)).toBe(2.75);
  });

  it('never calculates a fixed advance above the order total', () => {
    expect(partialPaymentAmount({ ...config, partialPaymentPercentage: null, partialPaymentFixedAmount: 5_000 }, 3_000)).toBe(3_000);
  });
});
