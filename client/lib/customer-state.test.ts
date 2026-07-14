import { describe, expect, it } from 'vitest';
import { isCustomerVisibleProduct, isCustomerVisibleText } from './customer-state';
import type { Product } from '../types/product.types';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'qa-product', title: 'QA-VARIANT-LUXURY-TEE', slug: 'qa-variant-luxury-tee', description: 'QA product', richDescription: 'QA product description', brand: 'Cruisin', category: 'tops', categoryIds: [], collections: [], images: [], basePrice: 1999, variants: [], tags: [], isFeatured: false, ratings: { avg: 0, count: 0 }, seo: { metaTitle: 'QA', metaDesc: 'QA', ogImage: '' }, reviews: [], status: 'published', visibility: 'visible', isActive: true, ...overrides
});

describe('customer product visibility', () => {
  it('uses publication state rather than brittle title keywords', () => {
    expect(isCustomerVisibleProduct(product())).toBe(true);
    expect(isCustomerVisibleText('QA luxury tee')).toBe(true);
  });

  it('hides draft, archived, inactive, and explicitly hidden products', () => {
    expect(isCustomerVisibleProduct(product({ status: 'draft' }))).toBe(false);
    expect(isCustomerVisibleProduct(product({ isArchived: true }))).toBe(false);
    expect(isCustomerVisibleProduct(product({ isActive: false }))).toBe(false);
    expect(isCustomerVisibleProduct(product({ visibility: 'hidden' }))).toBe(false);
  });
});
