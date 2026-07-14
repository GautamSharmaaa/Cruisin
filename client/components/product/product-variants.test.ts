import { describe, expect, it } from 'vitest';
import { compareSizes, selectCardVariant, swatchBackground, uniqueVariantsBySize } from '../../lib/variant-utils';
import type { ProductVariant } from '../../types/product.types';

const variant = (id: string, size: string, stock = 3): ProductVariant => ({ id, size, stock, color: 'Black', colorHex: '#050505', sku: `QA-${id}`, price: 1999, enabled: true, images: [] });

describe('Storefront product variant controls', () => {
  it('uses the exact stored HEX value and an explicit invalid-value pattern', () => {
    expect(swatchBackground('#FFFFFF')).toBe('#FFFFFF');
    expect(swatchBackground('white')).toContain('repeating-linear-gradient');
  });

  it('naturally orders apparel and numeric sizes', () => {
    expect(['XL', 'S', '10', '2', 'M', 'XS'].sort(compareSizes)).toEqual(['XS', 'S', 'M', 'XL', '2', '10']);
  });

  it('deduplicates and naturally sorts size variants while preserving sold-out stock', () => {
    const result = uniqueVariantsBySize([variant('m-one', 'M'), variant('m-two', 'M'), variant('s', 'S', 0)]);
    expect(result.map((item) => item.size)).toEqual(['S', 'M']);
    expect(result[0]?.stock).toBe(0);
  });

  it('selects the matching filtered variant and never quick-adds a sold-out combination', () => {
    const variants = [
      variant('black-m', 'M', 0),
      { ...variant('white-s', 'S', 4), color: 'White', colorHex: '#FFFFFF' }
    ];
    const soldOut = selectCardVariant(variants, 'black', 'm');
    expect(soldOut.display?.sku).toBe('QA-black-m');
    expect(soldOut.purchasable).toBeUndefined();
    const white = selectCardVariant(variants, 'WHITE');
    expect(white.display?.sku).toBe('QA-white-s');
    expect(white.purchasable?.sku).toBe('QA-white-s');
  });
});
