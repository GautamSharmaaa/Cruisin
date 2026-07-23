export interface ProductPayloadVariantInput {
  _id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  priceOverride?: number;
  lowStockThreshold?: number;
  enabled: boolean;
  images: string[];
}

export interface ProductPayloadInput {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  richDescription: string;
  category: string;
  categoryIds?: string;
  collections?: string;
  tags?: string;
  gender?: 'men' | 'women' | 'unisex';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'visible' | 'hidden';
  isSale?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isLatestDrop?: boolean;
  materialCare?: string;
  fitDetails?: string;
  shippingReturns?: string;
  sizeGuide?: string;
  productHighlights?: string;
  pickupAddress?: string;
  lowStockThreshold?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  basePrice: number;
  comparePrice?: number;
  costPrice?: number;
  gstPercent?: number;
  hsnCode?: string;
  productCode?: string;
  variants: ProductPayloadVariantInput[];
  image: string;
  hoverImage?: string;
  videoUrl?: string;
  mobileVideoUrl?: string;
  videoPosterImage?: string;
  imageAltText?: string;
}

const listFromCsv = (value?: string): string[] => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export const productPayloadFromInput = (input: ProductPayloadInput): Record<string, unknown> => ({
  title: input.title,
  slug: input.slug,
  description: input.description,
  shortDescription: input.shortDescription ?? '',
  richDescription: input.richDescription,
  brand: 'Cruisin',
  category: input.category,
  categoryIds: Array.from(new Set([input.category, ...listFromCsv(input.categoryIds)])),
  collections: listFromCsv(input.collections),
  images: [{ url: input.image, alt: input.imageAltText || input.title, width: 1200, height: 1600 }],
  hoverImage: input.hoverImage ? { url: input.hoverImage, alt: input.imageAltText || input.title, width: 1200, height: 1600 } : null,
  videoUrl: input.videoUrl ?? '',
  mobileVideoUrl: input.mobileVideoUrl ?? '',
  videoPosterImage: input.videoPosterImage ?? '',
  imageAltText: input.imageAltText ?? '',
  basePrice: input.basePrice,
  comparePrice: input.comparePrice,
  costPrice: input.costPrice,
  gstPercent: input.gstPercent,
  hsnCode: input.hsnCode ?? '',
  productCode: input.productCode ?? '',
  variants: input.variants.map((variant) => ({
    ...(variant._id ? { _id: variant._id } : {}),
    size: variant.size.trim(),
    color: variant.color.trim(),
    colorHex: variant.colorHex.toUpperCase(),
    sku: variant.sku.trim().toUpperCase(),
    price: variant.priceOverride ?? input.basePrice,
    ...(variant.priceOverride !== undefined ? { priceOverride: variant.priceOverride } : {}),
    stock: variant.stock,
    enabled: variant.enabled,
    ...(variant.lowStockThreshold !== undefined ? { lowStockThreshold: variant.lowStockThreshold } : {}),
    images: variant.images.map((url, index) => ({
      url,
      alt: `${input.title} — ${variant.color} — photo ${index + 1}`,
      width: 1200,
      height: 1600
    }))
  })),
  tags: listFromCsv(input.tags),
  gender: input.gender ?? 'unisex',
  status: input.status ?? 'published',
  visibility: input.visibility ?? 'visible',
  isSale: input.isSale ?? Boolean(input.comparePrice),
  isFeatured: input.isFeatured ?? false,
  isBestseller: input.isBestseller ?? false,
  isNewArrival: input.isNewArrival ?? false,
  isLatestDrop: input.isLatestDrop ?? false,
  isActive: input.status !== 'draft' && input.visibility !== 'hidden',
  materialCare: input.materialCare ?? '',
  fitDetails: input.fitDetails ?? '',
  shippingReturns: input.shippingReturns ?? '',
  sizeGuide: input.sizeGuide ?? '',
  productHighlights: listFromCsv(input.productHighlights),
  pickupAddress: input.pickupAddress ?? '',
  lowStockThreshold: input.lowStockThreshold ?? 10,
  weight: input.weight,
  dimensions: { length: input.length, width: input.width, height: input.height },
  seo: { metaTitle: input.seoTitle || input.title, metaDesc: input.seoDescription || input.description, ogImage: input.ogImage || input.image }
});
