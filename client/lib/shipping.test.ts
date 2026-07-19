import { describe, expect, it } from 'vitest';
import { calculateShippingCharge } from './shipping';

describe('calculateShippingCharge', () => {
  it('charges the standard rate below the free-shipping threshold', () => {
    expect(calculateShippingCharge(10_000, false, 'standard')).toBe(900);
  });

  it('waives standard shipping at the threshold', () => {
    expect(calculateShippingCharge(25_000, false, 'standard')).toBe(0);
  });

  it('charges the express rate even when standard shipping is complimentary', () => {
    expect(calculateShippingCharge(25_000, false, 'express')).toBe(1800);
  });

  it('honours a free-shipping coupon for either method', () => {
    expect(calculateShippingCharge(10_000, true, 'express')).toBe(0);
  });
});
