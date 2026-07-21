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

  it('uses administrator-configured shipping rates', () => {
    const settings = { standardShippingRate: 0, expressShippingRate: 149, freeStandardShippingThreshold: 999_999 };
    expect(calculateShippingRate(10, false, 'standard', settings)).toBe(0);
    expect(calculateShippingRate(10, false, 'express', settings)).toBe(149);
  });

  it('waives the configured standard charge exactly at the configured threshold', () => {
    const settings = { standardShippingRate: 99, expressShippingRate: 199, freeStandardShippingThreshold: 1_000 };
    expect(calculateShippingRate(999, false, 'standard', settings)).toBe(99);
    expect(calculateShippingRate(1_000, false, 'standard', settings)).toBe(0);
    expect(calculateShippingRate(1_000, false, 'express', settings)).toBe(199);
  });

  it('treats a zero threshold as disabled', () => {
    expect(calculateShippingRate(50_000, false, 'standard', {
      standardShippingRate: 99,
      freeStandardShippingThreshold: 0
    })).toBe(99);
  });
});
