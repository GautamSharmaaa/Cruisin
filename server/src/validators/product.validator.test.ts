import { describe, expect, it } from 'vitest';
import { productBodySchema } from './product.validator.js';

const image = (url: string) => ({ url, alt: 'Athletic shorts photo', width: 1200, height: 1600 });
const product = {
  title: 'Athletic Shorts',
  slug: 'athletic-shorts',
  description: 'Performance athletic shorts for training.',
  richDescription: 'Performance athletic shorts for training and gym sessions.',
  brand: 'Cruisin',
  category: '665f6d8403bd2edc93800000',
  categoryIds: ['665f6d8403bd2edc93800000'],
  collections: [],
  images: [image('https://example.com/product.jpg')],
  basePrice: 799,
  variants: [{
    size: 'M',
    color: 'Blue',
    colorHex: '#145DFF',
    sku: 'CRUISIN-SHORT-103-BLUE-M',
    price: 799,
    stock: 20,
    images: [
      image('https://example.com/hero.jpg'),
      image('https://example.com/front.jpg'),
      image('https://example.com/back.jpg')
    ]
  }],
  tags: ['gym', 'training']
};

describe('product validator ordered variant media', () => {
  it('accepts and preserves an ordered variant photo list', () => {
    const result = productBodySchema.parse(product);
    expect(result.variants[0].images.map((item) => item.url)).toEqual([
      'https://example.com/hero.jpg',
      'https://example.com/front.jpg',
      'https://example.com/back.jpg'
    ]);
  });

  it('rejects duplicate photo URLs and more than 24 photos', () => {
    const duplicate = productBodySchema.safeParse({
      ...product,
      variants: [{ ...product.variants[0], images: [image('https://example.com/same.jpg'), image('https://example.com/same.jpg')] }]
    });
    const tooMany = productBodySchema.safeParse({
      ...product,
      variants: [{ ...product.variants[0], images: Array.from({ length: 25 }, (_, index) => image(`https://example.com/${index}.jpg`)) }]
    });
    expect(duplicate.success).toBe(false);
    expect(tooMany.success).toBe(false);
  });
});
