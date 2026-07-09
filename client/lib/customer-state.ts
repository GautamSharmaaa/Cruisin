// Governed by .rules v1.0
import type { Product } from '@/types/product.types';

const testContentPattern = /\b(QA|browser test|manual product|temporary browser|sample product|placeholder)\b/i;

export const isCustomerVisibleText = (value: string): boolean => !testContentPattern.test(value);

export const isCustomerVisibleProduct = (product: Partial<Product> | null | undefined): product is Product => {
  if (!product?.slug || !product.title) return false;
  const imageCopy = product.images?.map((image) => image.alt).join(' ') ?? '';
  return isCustomerVisibleText([product.title, product.slug, product.description, product.richDescription, imageCopy].filter(Boolean).join(' '));
};

export const filterCustomerVisibleProducts = (products: Array<Partial<Product> | null | undefined>): Product[] => {
  return products.filter(isCustomerVisibleProduct);
};
