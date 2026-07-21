import { describe, expect, it } from 'vitest';
import { calculateShippingCharge, shippingQuote } from './shipping';

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

  it('uses the published storefront shipping settings', () => {
    const settings = { standardShippingRate: 0, expressShippingRate: 149, freeStandardShippingThreshold: 999_999 };
    expect(calculateShippingCharge(10, false, 'standard', settings)).toBe(0);
    expect(calculateShippingCharge(10, false, 'express', settings)).toBe(149);
  });

  it('waives a configured ₹99 charge at the ₹1,000 threshold', () => {
    const settings = { standardShippingRate: 99, expressShippingRate: 199, freeStandardShippingThreshold: 1_000 };
    expect(calculateShippingCharge(999, false, 'standard', settings)).toBe(99);
    expect(calculateShippingCharge(1_000, false, 'standard', settings)).toBe(0);
    expect(shippingQuote(1_000, false, 'standard', settings)).toMatchObject({
      amount: 0,
      compareAt: 99,
      isFree: true,
      promotionReason: 'threshold'
    });
  });

  it('supports an automatic delivery promotion without a coupon', () => {
    expect(shippingQuote(100, false, 'standard', {
      standardShippingRate: 0,
      standardShippingCompareAt: 99,
      freeStandardShippingThreshold: 0
    })).toEqual({
      amount: 0,
      compareAt: 99,
      isFree: true,
      promotionReason: 'promotion',
      remainingForFreeStandardShipping: 0
    });
  });

  it('treats a zero threshold as disabled instead of making every order free', () => {
    expect(calculateShippingCharge(10_000, false, 'standard', {
      standardShippingRate: 99,
      freeStandardShippingThreshold: 0
    })).toBe(99);
  });

  it('keeps express delivery chargeable when only the standard threshold is reached', () => {
    const settings = { standardShippingRate: 99, expressShippingRate: 199, freeStandardShippingThreshold: 1_000 };
    expect(shippingQuote(1_000, false, 'express', settings)).toMatchObject({
      amount: 199,
      compareAt: 0,
      isFree: false,
      promotionReason: null
    });
  });
});
