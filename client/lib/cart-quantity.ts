// Governed by .rules v1.0
import type { Product } from '@/types/product.types';

export const availableVariantStock = (product: Product, variantId: string): number => {
  const stock = product.variants.find((variant) => variant.id === variantId)?.stock ?? 0;
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
};

export const stockBoundQuantity = (requestedQuantity: number, stock: number): number => {
  if (stock <= 0) return 0;
  const normalized = Number.isFinite(requestedQuantity) ? Math.floor(requestedQuantity) : 1;
  return Math.min(Math.max(1, normalized), Math.floor(stock));
};
