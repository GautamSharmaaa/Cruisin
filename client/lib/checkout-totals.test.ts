// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { taxInclusiveCheckoutTotals } from './checkout-totals';

describe('taxInclusiveCheckoutTotals', () => {
  it('does not add tax to tax-inclusive product prices', () => {
    expect(taxInclusiveCheckoutTotals(1598, 0, 0)).toEqual({
      discountedSubtotal: 1598,
      tax: 0,
      total: 1598
    });
  });

  it('only adds shipping after discounts', () => {
    expect(taxInclusiveCheckoutTotals(1598, 100, 900)).toEqual({
      discountedSubtotal: 1498,
      tax: 0,
      total: 2398
    });
  });
});
