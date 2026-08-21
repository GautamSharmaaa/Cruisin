import { describe, expect, it } from 'vitest';
import { automaticBundleDiscount, combinedCartDiscount, recommendationBundleDiscount } from './bundle-discount';
import type { Product } from '@/types/product.types';

const product = (id: string, recommendedProductIds: string[] = []): Product => ({
  id, title: id, slug: id, description: id, richDescription: id, brand: 'Cruisin', category: '', categoryIds: [], collections: [], images: [], basePrice: 500,
  variants: [], tags: [], isFeatured: false, ratings: { avg: 0, count: 0 }, seo: { metaTitle: id, metaDesc: id, ogImage: '' }, reviews: [], recommendedProductIds,
  completeTheFit: id === 'anchor' ? { enabled: true, strategy: 'manual', bundleDiscount: { enabled: true, twoItemDiscount: 100, threeItemDiscount: 300 } } : undefined
});

describe('automaticBundleDiscount', () => {
  it('counts eligible quantities and unlocks the strongest tier', () => {
    const anchor = product('anchor', ['second', 'third']);
    expect(automaticBundleDiscount([{ product: anchor, quantity: 2 }])).toMatchObject({ amount: 100, threshold: 2, eligibleProductCount: 2 });
    expect(automaticBundleDiscount([{ product: anchor, quantity: 2 }, { product: product('second'), quantity: 1 }])).toMatchObject({ amount: 300, threshold: 3, eligibleProductCount: 3 });
    expect(automaticBundleDiscount([{ product: anchor, quantity: 1 }, { product: product('second'), quantity: 1 }, { product: product('third'), quantity: 1 }])).toMatchObject({ amount: 300, threshold: 3 });
    expect(automaticBundleDiscount([{ product: anchor, quantity: 1 }, { product: product('second'), quantity: 1 }, { product: product('third'), quantity: 1 }, { product: product('fourth'), quantity: 4 }])).toMatchObject({ amount: 300, threshold: 3 });
  });

  it('stacks with a coupon but never discounts below zero', () => {
    const anchor = product('anchor', ['second']);
    expect(combinedCartDiscount([{ product: anchor, quantity: 1 }, { product: product('second'), quantity: 1 }], 450, 500)).toEqual({ couponDiscount: 450, bundleDiscount: 100, totalDiscount: 500 });
  });

  it('prices two quantities of the same configured product from recommendation data', () => {
    const anchor = product('anchor', ['second']);
    expect(recommendationBundleDiscount([{ product: anchor, quantity: 2 }], {
      source: 'manual',
      anchorProductId: 'anchor',
      eligibleProductIds: ['second'],
      bundleDiscount: { enabled: true, twoItemDiscount: 100, threeItemDiscount: 300 }
    })).toBe(100);
  });
});
