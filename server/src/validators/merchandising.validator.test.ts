import { describe, expect, it } from 'vitest';
import { siteSettingsBodySchema } from './merchandising.validator.js';

describe('siteSettingsBodySchema delivery configuration', () => {
  it('accepts the global listing hero-media visibility control', () => {
    expect(siteSettingsBodySchema.partial().parse({ isListingHeroMediaEnabled: false })).toEqual({ isListingHeroMediaEnabled: false });
  });

  it('accepts a paid standard rate with a free-delivery threshold', () => {
    expect(siteSettingsBodySchema.partial().parse({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1_000
    })).toEqual({
      standardShippingRate: 99,
      standardShippingCompareAt: 99,
      expressShippingRate: 199,
      freeStandardShippingThreshold: 1_000
    });
  });

  it('accepts a coupon-free automatic delivery promotion', () => {
    expect(siteSettingsBodySchema.partial().parse({
      standardShippingRate: 0,
      standardShippingCompareAt: 99,
      freeStandardShippingThreshold: 0
    })).toMatchObject({
      standardShippingRate: 0,
      standardShippingCompareAt: 99,
      freeStandardShippingThreshold: 0
    });
  });

  it('rejects negative or unreasonably large delivery values', () => {
    expect(() => siteSettingsBodySchema.partial().parse({ standardShippingRate: -1 })).toThrow();
    expect(() => siteSettingsBodySchema.partial().parse({ freeStandardShippingThreshold: 1_000_001 })).toThrow();
  });
});

describe('storefront ring color configuration', () => {
  it('normalizes approved hex colors without resetting unrelated settings', () => {
    expect(siteSettingsBodySchema.partial().parse({ cruisinRingColorLight: ' #ABCDEF ' })).toEqual({ cruisinRingColorLight: '#abcdef' });
    expect(siteSettingsBodySchema.partial().parse({ isStorefrontNavigationVisible: false })).toEqual({ isStorefrontNavigationVisible: false });
  });
  it.each(['orange', '#fff', '#12345678', 'url(javascript:alert(1))', '#f58032; color:red', '', null, 123])('rejects unsafe or malformed color %s', color => {
    expect(siteSettingsBodySchema.partial().safeParse({ cruisinRingColorDark: color }).success).toBe(false);
  });
});
