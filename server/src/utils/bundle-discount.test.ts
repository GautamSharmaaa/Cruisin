import { describe, expect, it } from 'vitest';
import { calculateBundleDiscount } from './bundle-discount.js';

const anchor = {
  id: 'anchor',
  recommendedProductIds: ['second', 'third'],
  strategy: 'manual' as const,
  bundleDiscount: { enabled: true, twoItemDiscount: 100, threeItemDiscount: 300 }
};

describe('calculateBundleDiscount', () => {
  it('unlocks the strongest configured tier using eligible quantities', () => {
    expect(calculateBundleDiscount([{ productId: 'anchor', quantity: 2 }], [anchor])).toMatchObject({ amount: 100, threshold: 2, eligibleProductCount: 2 });
    expect(calculateBundleDiscount([{ productId: 'anchor', quantity: 2 }, { productId: 'second', quantity: 1 }], [anchor])).toMatchObject({ amount: 300, threshold: 3, eligibleProductCount: 3 });
    const result = calculateBundleDiscount([{ productId: 'anchor', quantity: 1 }, { productId: 'second', quantity: 1 }, { productId: 'third', quantity: 1 }], [anchor]);
    expect(result).toMatchObject({ amount: 300, threshold: 3, eligibleProductCount: 3 });
    expect(calculateBundleDiscount([{ productId: 'anchor', quantity: 1 }, { productId: 'second', quantity: 1 }, { productId: 'third', quantity: 1 }, { productId: 'fourth', quantity: 10 }], [anchor])).toMatchObject({ amount: 300, threshold: 3 });
  });

  it('counts every bag item toward the global milestone, including manually curated rails', () => {
    const result = calculateBundleDiscount([{ productId: 'anchor', quantity: 1 }, { productId: 'unrelated', quantity: 1 }], [anchor]);
    expect(result).toMatchObject({ amount: 100, eligibleProductCount: 2, threshold: 2 });
  });

  it('allows automatic strategies to use distinct products in the bag', () => {
    const result = calculateBundleDiscount([
      { productId: 'anchor', quantity: 1 },
      { productId: 'any-product', quantity: 1 }
    ], [{ ...anchor, strategy: 'best_sellers' }]);
    expect(result).toMatchObject({ amount: 100, threshold: 2 });
  });
});
