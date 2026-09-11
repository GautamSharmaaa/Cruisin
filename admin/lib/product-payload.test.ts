import { describe, expect, it } from 'vitest';
import { productPayloadFromInput } from './product-payload';

describe('product internal cost payload', () => {
  it('persists structured per-unit costs and computes the compatibility total', () => {
    const payload = productPayloadFromInput({
      title: 'Costed Tee',
      slug: 'costed-tee',
      description: 'A sufficiently detailed product description.',
      richDescription: 'A sufficiently detailed rich product description.',
      category: '66b000000000000000000001',
      basePrice: 1_200,
      manufacturingCost: 300,
      packagingCost: 25,
      marketingCost: 40,
      handlingCost: 10,
      otherCost: 5,
      variants: [{ sku: 'COST-M', size: 'M', color: 'Black', colorHex: '#000000', stock: 1, enabled: true, images: ['https://example.test/tee.jpg'] }],
      image: 'https://example.test/tee.jpg'
    });

    expect(payload.costBreakdown).toEqual({ manufacturing: 300, packaging: 25, marketing: 40, handling: 10, other: 5 });
    expect(payload.costPrice).toBe(380);
  });

  it('supplies editable shipping defaults when measurements are omitted', () => {
    const payload = productPayloadFromInput({
      title: 'Default Parcel Tee',
      slug: 'default-parcel-tee',
      description: 'A sufficiently detailed product description.',
      richDescription: 'A sufficiently detailed rich product description.',
      category: '66b000000000000000000001',
      basePrice: 999,
      variants: [{ sku: 'DEFAULT-M', size: 'M', color: 'Black', colorHex: '#000000', stock: 1, enabled: true, images: ['https://example.test/tee.jpg'] }],
      image: 'https://example.test/tee.jpg'
    });

    expect(payload.weight).toBe(0.2);
    expect(payload.dimensions).toEqual({ length: 30.48, width: 25.4, height: 2 });
  });

  it('serializes curated Complete the Fit products and automatic bundle tiers', () => {
    const payload = productPayloadFromInput({
      title: 'Bundle Tee',
      slug: 'bundle-tee',
      description: 'A sufficiently detailed product description.',
      richDescription: 'A sufficiently detailed rich product description.',
      category: '66b000000000000000000001',
      basePrice: 999,
      completeTheFitStrategy: 'manual',
      recommendedProducts: '66b000000000000000000002, 66b000000000000000000003',
      bundleDiscountEnabled: true,
      bundleTwoItemDiscount: 100,
      bundleThreeItemDiscount: 300,
      variants: [{ sku: 'BUNDLE-M', size: 'M', color: 'Black', colorHex: '#000000', stock: 1, enabled: true, images: ['https://example.test/tee.jpg'] }],
      image: 'https://example.test/tee.jpg'
    });
    expect(payload.recommendedProducts).toEqual(['66b000000000000000000002', '66b000000000000000000003']);
    expect(payload.completeTheFit).toMatchObject({ strategy: 'manual', bundleDiscount: { enabled: true, twoItemDiscount: 100, threeItemDiscount: 300 } });
  });
});
