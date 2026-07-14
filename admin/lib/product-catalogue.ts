// Governed by .rules v1.0
import type { ProductDto } from '@/types/dto.types';
import { csvCell } from '@/lib/export-csv';

export type ProductStockState = 'in-stock' | 'low-stock' | 'out-of-stock';
export type ProductHealthState = 'good' | 'needs-fix' | 'critical';

export interface ProductHealth {
  score: number;
  state: ProductHealthState;
  missing: string[];
}

export const productId = (product: ProductDto): string => product.id ?? product._id ?? product.slug;

export const productCategoryName = (product: ProductDto): string => {
  if (!product.category) return 'Unassigned';
  if (typeof product.category === 'string') return product.category;
  return product.category.name;
};

export const productTotalStock = (product: ProductDto): number => (product.variants ?? []).reduce((sum, variant) => sum + variant.stock, 0);

export const productBaseSku = (product: ProductDto): string => product.productCode ?? product.variants?.[0]?.sku ?? 'No SKU';

export const productColor = (product: ProductDto): string => product.variants?.[0]?.color ?? 'No color';

export const productStatus = (product: ProductDto): 'archived' | 'visible' | 'hidden' => {
  if (product.isArchived) return 'archived';
  return product.isActive ? 'visible' : 'hidden';
};

export const stockState = (product: ProductDto): ProductStockState => {
  const stock = productTotalStock(product);
  if (stock <= 0) return 'out-of-stock';
  if (stock <= (product.lowStockThreshold ?? 10)) return 'low-stock';
  return 'in-stock';
};

export const calculateProductHealth = (product: ProductDto): ProductHealth => {
  const checks: Array<[boolean, string]> = [
    [Boolean(product.images?.length), 'Product image'],
    [Boolean(product.title?.trim()), 'Product title'],
    [Boolean(product.description?.trim()), 'Description'],
    [Boolean(product.category), 'Category'],
    [product.basePrice > 0, 'Price'],
    [Boolean(product.variants?.length), 'Variants'],
    [productTotalStock(product) > 0, 'Stock'],
    [Boolean(product.slug?.trim()), 'Slug'],
    [productBaseSku(product) !== 'No SKU', 'Product code or SKU'],
    [Boolean(product.seo?.metaTitle), 'SEO title'],
    [Boolean(product.seo?.metaDesc), 'SEO description'],
    [Boolean(product.weight || product.dimensions?.length || product.dimensions?.width || product.dimensions?.height), 'Shipping weight/dimensions'],
    [Boolean((product.variants ?? []).some((variant) => variant.enabled !== false)), 'Enabled variant']
  ];
  const missing = checks.filter(([passes]) => !passes).map(([, label]) => label);
  const score = Math.max(0, Math.round(((checks.length - missing.length) / checks.length) * 100));
  const state: ProductHealthState = score >= 80 ? 'good' : score >= 50 ? 'needs-fix' : 'critical';
  return { score, state, missing };
};

export const productInsight = (product: ProductDto): string => {
  const variants = [...(product.variants ?? [])].sort((a, b) => a.stock - b.stock);
  const firstLowVariant = variants.find((variant) => variant.stock > 0 && variant.stock <= (variant.lowStockThreshold ?? product.lowStockThreshold ?? 10));
  if (firstLowVariant) return 'Only ' + firstLowVariant.stock + ' left in size ' + firstLowVariant.size;
  if (productTotalStock(product) === 0) return 'Restock before publishing';
  if ((product.lifetimeSales ?? 0) === 0) return 'Never sold';
  if (productTotalStock(product) <= (product.lowStockThreshold ?? 10) && (product.lifetimeSales ?? 0) > 10) return 'Needs restock';
  return 'Inventory stable';
};

const csvValue = csvCell;

export const productsToCsv = (products: ProductDto[]): string => {
  const headers = ['Product Name', 'Slug', 'Product Code / Base SKU', 'Category', 'Color', 'Price', 'Sale Price', 'Total Stock', 'Size-wise Stock', 'Status', 'Visibility', 'Featured', 'Bestseller', 'New Arrival', 'Lifetime Sales', 'Product Health Score', 'Created Date', 'Updated Date'];
  const rows = products.map((product) => {
    const health = calculateProductHealth(product);
    const sizeStock = (product.variants ?? []).map((variant) => variant.size + ':' + variant.stock).join(' | ');
    return [
      product.title,
      product.slug,
      productBaseSku(product),
      productCategoryName(product),
      productColor(product),
      product.basePrice,
      product.comparePrice,
      productTotalStock(product),
      sizeStock,
      productStatus(product),
      product.isActive ? 'Visible' : 'Hidden',
      product.isFeatured,
      Boolean(product.isBestseller),
      Boolean(product.isNewArrival),
      product.lifetimeSales ?? 0,
      health.score,
      product.createdAt,
      product.updatedAt
    ].map(csvValue).join(',');
  });
  return [headers.map(csvValue).join(','), ...rows].join('\n');
};

export const downloadProductsCsv = (products: ProductDto[]): void => {
  const csv = productsToCsv(products);
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cruisin-products-' + date + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const validateStockValue = (value: number): string | null => {
  if (!Number.isInteger(value)) return 'Stock must be a whole number.';
  if (value < 0) return 'Stock cannot be negative.';
  return null;
};
