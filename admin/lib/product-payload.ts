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
  completeTheFitEnabled?: boolean;
  completeTheFitStrategy?: 'manual' | 'frequently_bought_together' | 'best_sellers';
  completeTheFitTitle?: string;
  completeTheFitEyebrow?: string;
  completeTheFitDescription?: string;
  recommendedProducts?: string;
  bundleDiscountEnabled?: boolean;
  bundleTwoItemDiscount?: number;
  bundleThreeItemDiscount?: number;
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
  packagingWeight?: number;
  defaultPackagePreset?: string;
  maximumQuantityPerPackage?: number;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  basePrice: number;
  comparePrice?: number;
  costPrice?: number;
  manufacturingCost?: number;
  packagingCost?: number;
  marketingCost?: number;
  handlingCost?: number;
  otherCost?: number;
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

const DEFAULT_SHIPPING_MEASUREMENTS = {
  weight: 0.2,
  length: 30.48,
  width: 25.4,
  height: 2
} as const;

const listFromCsv = (value?: string): string[] => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export const productPayloadFromInput = (input: ProductPayloadInput): Record<string, unknown> => {
  const costBreakdown = {
    manufacturing: input.manufacturingCost ?? input.costPrice ?? 0,
    packaging: input.packagingCost ?? 0,
    marketing: input.marketingCost ?? 0,
    handling: input.handlingCost ?? 0,
    other: input.otherCost ?? 0
  };
  const costPrice = Object.values(costBreakdown).reduce((sum, value) => sum + value, 0);
  return ({
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
  costPrice,
  costBreakdown,
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
  recommendedProducts: listFromCsv(input.recommendedProducts),
  completeTheFit: {
    enabled: input.completeTheFitEnabled ?? true,
    strategy: input.completeTheFitStrategy ?? 'frequently_bought_together',
    title: input.completeTheFitTitle || 'Complete The Fit',
    eyebrow: input.completeTheFitEyebrow || 'Your kit is building',
    description: input.completeTheFitDescription || 'Explore one more piece.',
    bundleDiscount: {
      enabled: input.bundleDiscountEnabled ?? true,
      twoItemDiscount: input.bundleTwoItemDiscount ?? 100,
      threeItemDiscount: input.bundleThreeItemDiscount ?? 300
    }
  },
  isActive: input.status !== 'draft' && input.visibility !== 'hidden',
  materialCare: input.materialCare ?? '',
  fitDetails: input.fitDetails ?? '',
  shippingReturns: input.shippingReturns ?? '',
  sizeGuide: input.sizeGuide ?? '',
  productHighlights: listFromCsv(input.productHighlights),
  pickupAddress: input.pickupAddress ?? '',
  lowStockThreshold: input.lowStockThreshold ?? 10,
  weight: input.weight ?? DEFAULT_SHIPPING_MEASUREMENTS.weight,
  dimensions: {
    length: input.length ?? DEFAULT_SHIPPING_MEASUREMENTS.length,
    width: input.width ?? DEFAULT_SHIPPING_MEASUREMENTS.width,
    height: input.height ?? DEFAULT_SHIPPING_MEASUREMENTS.height
  },
  packagingWeight: input.packagingWeight,
  defaultPackagePreset: input.defaultPackagePreset?.trim() || undefined,
  maximumQuantityPerPackage: input.maximumQuantityPerPackage ?? 10,
  seo: { metaTitle: input.seoTitle || input.title, metaDesc: input.seoDescription || input.description, ogImage: input.ogImage || input.image }
  });
};
