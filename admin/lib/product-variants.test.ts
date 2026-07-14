import { describe, expect, it } from 'vitest';
import { productPayloadFromInput as productPayload, type ProductPayloadInput as AdminProductInput } from './product-payload';
import { adminProductSchema } from './schemas';

const variants: AdminProductInput['variants'] = [
  { sku: 'QA-VARIANT-BLK-S', size: 'S', color: 'Black', colorHex: '#050505', stock: 4, enabled: true, image: 'https://example.com/black.jpg' },
  { sku: 'QA-VARIANT-BLK-M', size: 'M', color: 'Black', colorHex: '#050505', stock: 0, enabled: true, image: 'https://example.com/black.jpg' },
  { sku: 'QA-VARIANT-WHT-S', size: 'S', color: 'White', colorHex: '#FFFFFF', stock: 7, enabled: true, image: 'https://example.com/white.jpg' },
  { sku: 'QA-VARIANT-WHT-M', size: 'M', color: 'White', colorHex: '#FFFFFF', stock: 3, enabled: false, image: 'https://example.com/white.jpg' }
];

const product: AdminProductInput = {
  title: 'QA Variant Luxury Tee',
  slug: '',
  description: 'A deterministic QA product description.',
  richDescription: 'A deterministic QA product rich description.',
  category: '665f6d8403bd2edc93800000',
  basePrice: 1999,
  variants,
  image: 'https://example.com/product.jpg'
};

describe('Admin product multi-variant contract', () => {
  it('accepts a blank slug for title-based generation and a complete variant matrix', () => {
    expect(adminProductSchema.safeParse(product).success).toBe(true);
  });

  it('rejects duplicate SKUs and duplicate color-size combinations', () => {
    const duplicate = { ...product, variants: [...variants, { ...variants[0], colorHex: '#111111' }] };
    const result = adminProductSchema.safeParse(duplicate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.at(-1) === 'sku')).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.at(-1) === 'size')).toBe(true);
    }
  });

  it('serializes every variant with its exact visual color, image, stock, and enabled state', () => {
    const payload = productPayload(product);
    expect(payload.variants).toHaveLength(4);
    expect(payload.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: 'QA-VARIANT-BLK-M', colorHex: '#050505', stock: 0, enabled: true }),
      expect.objectContaining({ sku: 'QA-VARIANT-WHT-M', colorHex: '#FFFFFF', stock: 3, enabled: false, images: [expect.objectContaining({ url: 'https://example.com/white.jpg' })] })
    ]));
  });
});
