import { describe, expect, it } from 'vitest';
import { adminProductSchema } from './schemas';

const product = {
  title: 'Athletic Shorts',
  description: 'Performance shorts for demanding gym sessions.',
  richDescription: 'Performance shorts with a supportive compression liner.',
  category: '665f6d8403bd2edc93800000',
  basePrice: 799,
  comparePrice: 1_999,
  variants: [{ sku: 'SHORT-BLUE-S', size: 'S', color: 'Blue', colorHex: '#0055FF', stock: 20, enabled: true, images: ['https://example.com/shorts.jpg'] }],
  image: 'https://example.com/shorts.jpg'
};

describe('admin product pricing', () => {
  it('accepts a selling price below MRP', () => {
    expect(adminProductSchema.safeParse(product).success).toBe(true);
  });

  it('rejects an MRP equal to or below the selling price', () => {
    expect(adminProductSchema.safeParse({ ...product, comparePrice: 799 }).success).toBe(false);
    expect(adminProductSchema.safeParse({ ...product, comparePrice: 700 }).success).toBe(false);
  });
});
