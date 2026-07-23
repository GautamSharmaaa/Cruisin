import { describe, expect, it } from 'vitest';
import { mapProduct, type ApiProduct } from './product-mapper';

const image = (url: string) => ({ url, alt: url, width: 1200, height: 1600 });

describe('product mapper ordered variant media', () => {
  it('preserves API variant photo order exactly for the storefront gallery', () => {
    const product: ApiProduct = {
      _id: 'product-id',
      title: 'Ordered Athletic Shorts',
      slug: 'ordered-athletic-shorts',
      description: 'Ordered gallery description',
      richDescription: 'Ordered gallery rich description',
      brand: 'Cruisin',
      category: 'gym-training-shorts',
      images: [image('product-fallback')],
      basePrice: 799,
      variants: [{
        _id: 'variant-id',
        size: 'M',
        color: 'Blue',
        colorHex: '#145DFF',
        sku: 'CRUISIN-SHORT-103-BLUE-M',
        price: 799,
        stock: 20,
        images: [image('hero'), image('front'), image('back'), image('detail')]
      }],
      tags: ['gym', 'training'],
      isFeatured: false
    };

    expect(mapProduct(product).variants[0].images.map((item) => item.url)).toEqual(['hero', 'front', 'back', 'detail']);
  });
});
