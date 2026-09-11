// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { logisticsQuoteQueryKey } from './useLogistics';

describe('logisticsQuoteQueryKey', () => {
  it('invalidates a delivery quote whenever the authoritative cart version changes', () => {
    expect(logisticsQuoteQueryKey('201318', 'prepaid', 8)).not.toEqual(
      logisticsQuoteQueryKey('201318', 'prepaid', 9)
    );
  });

  it('keeps postcode and payment mode in the quote identity', () => {
    expect(logisticsQuoteQueryKey('201318', 'prepaid', 9)).not.toEqual(
      logisticsQuoteQueryKey('201318', 'cod', 9)
    );
    expect(logisticsQuoteQueryKey('201318', 'prepaid', 9)).not.toEqual(
      logisticsQuoteQueryKey('110001', 'prepaid', 9)
    );
  });
});
