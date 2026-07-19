import { describe, expect, it } from 'vitest';
import { calculateShippingRate } from './shipping-rate.js';

describe('calculateShippingRate', () => {
  it('calculates standard, express, threshold, and coupon rates', () => {
    expect(calculateShippingRate(10_000, false, 'standard')).toBe(900);
    expect(calculateShippingRate(10_000, false, 'express')).toBe(1800);
    expect(calculateShippingRate(25_000, false, 'standard')).toBe(0);
    expect(calculateShippingRate(25_000, false, 'express')).toBe(1800);
    expect(calculateShippingRate(10_000, true, 'express')).toBe(0);
  });
});
