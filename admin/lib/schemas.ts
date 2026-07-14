// Governed by .rules v1.0
import { z } from 'zod';

const optionalNumber = (schema: z.ZodNumber) => z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, schema.optional());

export const adminProductVariantSchema = z.object({
  _id: z.string().optional(),
  sku: z.string().min(2),
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  stock: z.coerce.number().int().min(0),
  priceOverride: optionalNumber(z.coerce.number().min(0)),
  lowStockThreshold: optionalNumber(z.coerce.number().int().min(0)),
  enabled: z.boolean().default(true),
  image: z.string().url()
});

export const adminProductSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional().default(''),
  description: z.string().min(10),
  shortDescription: z.string().optional().default(''),
  richDescription: z.string().min(10),
  category: z.string().regex(/^[a-f\d]{24}$/i),
  categoryIds: z.string().optional().default(''),
  collections: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  gender: z.enum(['men', 'women', 'unisex']).default('unisex'),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  visibility: z.enum(['visible', 'hidden']).default('visible'),
  isSale: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isLatestDrop: z.boolean().default(false),
  materialCare: z.string().optional().default(''),
  fitDetails: z.string().optional().default(''),
  shippingReturns: z.string().optional().default(''),
  sizeGuide: z.string().optional().default(''),
  productHighlights: z.string().optional().default(''),
  pickupAddress: z.string().optional().default(''),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  weight: z.coerce.number().min(0).optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
  ogImage: z.string().optional().default(''),
  basePrice: z.coerce.number().min(0),
  comparePrice: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  hsnCode: z.string().optional().default(''),
  productCode: z.string().optional().default(''),
  variants: z.array(adminProductVariantSchema).min(1),
  image: z.string().url(),
  hoverImage: z.string().optional().default(''),
  videoUrl: z.string().optional().default(''),
  mobileVideoUrl: z.string().optional().default(''),
  videoPosterImage: z.string().optional().default(''),
  imageAltText: z.string().optional().default('')
}).superRefine((product, context) => {
  const skus = new Map<string, number>();
  const combinations = new Map<string, number>();
  product.variants.forEach((variant, index) => {
    const sku = variant.sku.trim().toUpperCase();
    const combination = `${variant.color.trim().toLowerCase()}|${variant.size.trim().toLowerCase()}`;
    const skuIndex = skus.get(sku);
    if (skuIndex !== undefined) context.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: `Duplicate SKU also used by variant ${skuIndex + 1}` });
    else skus.set(sku, index);
    const combinationIndex = combinations.get(combination);
    if (combinationIndex !== undefined) context.addIssue({ code: 'custom', path: ['variants', index, 'size'], message: `Duplicate color-size combination also used by variant ${combinationIndex + 1}` });
    else combinations.set(combination, index);
  });
});

export const adminCouponSchema = z.object({
  code: z.string().min(2),
  type: z.enum(['percentage', 'fixed', 'freeShipping']),
  value: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).default(0),
  maxDiscount: optionalNumber(z.coerce.number().min(0)),
  usageLimit: optionalNumber(z.coerce.number().int().min(1)),
  userUsageLimit: z.coerce.number().int().min(1).default(1),
  applicableProducts: z.string().optional().default(''),
  applicableCategories: z.string().optional().default(''),
  validFrom: z.preprocess((value) => value instanceof Date ? value.toISOString().slice(0, 10) : value ?? '', z.string().min(4)),
  validUntil: z.preprocess((value) => value instanceof Date ? value.toISOString().slice(0, 10) : value ?? '', z.string().min(4))
});

export const adminCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  parent: z.string().optional(),
  image: z.string().url(),
  description: z.string().optional().default(''),
  heroTitle: z.string().optional().default(''),
  heroSubtitle: z.string().optional().default(''),
  heroImage: z.string().optional().default(''),
  mobileHeroImage: z.string().optional().default(''),
  bannerImage: z.string().optional().default(''),
  mobileBannerImage: z.string().optional().default(''),
  thumbnailImage: z.string().optional().default(''),
  categoryCardImage: z.string().optional().default(''),
  categoryVideo: z.string().optional().default(''),
  mobileCategoryVideo: z.string().optional().default(''),
  backgroundVideo: z.string().optional().default(''),
  videoPosterImage: z.string().optional().default(''),
  imageAltText: z.string().optional().default(''),
  videoAutoplay: z.boolean().default(true),
  videoMuted: z.boolean().default(true),
  videoLoop: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInHeader: z.boolean().default(true),
  showInMenu: z.boolean().default(true),
  showInFilters: z.boolean().default(true),
  showOnHomepage: z.boolean().default(false),
  showOnCollectionPages: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  bannerTitle: z.string().optional().default(''),
  bannerSubtitle: z.string().optional().default(''),
  defaultSort: z.enum(['newest', 'price-asc', 'price-desc', 'best-selling', 'top-rated']).default('newest'),
  defaultGridView: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(4),
  areFiltersVisible: z.boolean().default(true),
  isAdvancedFilterEnabled: z.boolean().default(true),
  isFlashlightEnabled: z.boolean().default(true),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
  ogImage: z.string().optional().default(''),
  canonicalSlug: z.string().optional().default('')
});

export const adminOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  note: z.string().max(240).optional(),
  trackingNumber: z.string().max(80).optional()
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['customer', 'admin', 'superadmin', 'manager', 'viewer']),
  isActive: z.enum(['true', 'false'])
});

export const adminBannerSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().min(2),
  ctaText: z.string().min(2),
  ctaLink: z.string().min(1),
  image: z.string().url(),
  mobileImage: z.string().url(),
  position: z.string().min(2),
  startDate: z.string().min(4),
  endDate: z.string().min(4),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true)
});
