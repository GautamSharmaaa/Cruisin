// Governed by .rules v1.0
import type { Product } from '@/types/product.types';

export const isCustomerVisibleText = (value: string): boolean => Boolean(value.trim());

export const isCustomerVisibleProduct = (product: Partial<Product> | null | undefined): product is Product => {
  if (!product?.slug || !product.title) return false;
  if (product.isActive === false || product.isArchived === true || product.status === 'draft' || product.status === 'archived' || product.visibility === 'hidden') return false;
  return true;
};

export const filterCustomerVisibleProducts = (products: Array<Partial<Product> | null | undefined>): Product[] => {
  return products.filter(isCustomerVisibleProduct);
};
