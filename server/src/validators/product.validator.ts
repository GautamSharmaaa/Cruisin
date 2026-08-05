// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const imageSchema = z.object({ url: z.string().url(), alt: z.string().min(2), width: z.number().int().positive(), height: z.number().int().positive(), publicId: z.string().optional() });
const orderedImagesSchema = z.array(imageSchema).max(24).superRefine((images, context) => {
  const seen = new Set<string>();
  images.forEach((image, index) => {
    if (seen.has(image.url)) context.addIssue({ code: 'custom', path: [index, 'url'], message: 'Duplicate image URL' });
    seen.add(image.url);
  });
});
const packageDimensionsSchema = z.object({
  length: z.number().positive().max(300).optional(),
  width: z.number().positive().max(300).optional(),
  height: z.number().positive().max(300).optional()
});
const variantSchema = z.object({ _id: z.string().optional(), size: z.string().min(1), color: z.string().min(1), colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), sku: z.string().min(2), price: z.number().min(0), priceOverride: z.number().min(0).optional(), stock: z.number().int().min(0), enabled: z.boolean().default(true), lowStockThreshold: z.number().int().min(0).optional(), weight: z.number().positive().max(100).optional(), dimensions: packageDimensionsSchema.optional(), images: orderedImagesSchema.default([]) });
const optionalUrlSchema = z.union([z.string().url(), z.literal('')]).optional();
const optionalMediaSchema = z.union([z.string().url(), z.string().regex(/^\/[^\s]+$/), z.literal('')]).optional();
const productFieldsSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z.string().min(2).max(180),
  description: z.string().min(10),
  shortDescription: z.string().max(320).optional().default(''),
  richDescription: z.string().min(10),
  brand: z.string().min(2),
  category: objectIdSchema,
  categoryIds: z.array(objectIdSchema).default([]),
  collections: z.array(objectIdSchema).default([]),
  collectionSlugs: z.array(z.string()).default([]),
  images: z.array(imageSchema),
  hoverImage: imageSchema.nullable().optional(),
  videoUrl: optionalMediaSchema,
  mobileVideoUrl: optionalMediaSchema,
  videoPosterImage: optionalUrlSchema,
  imageAltText: z.string().max(180).optional().default(''),
  basePrice: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  variants: z.array(variantSchema),
  tags: z.array(z.string()).default([]),
  productCode: z.string().optional(),
  pickupAddress: z.string().optional(),
  lowStockThreshold: z.number().int().min(0).default(10),
  lifetimeSales: z.number().int().min(0).default(0),
  gender: z.enum(['men', 'women', 'unisex']).default('unisex'),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  visibility: z.enum(['visible', 'hidden']).default('visible'),
  isSale: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isLatestDrop: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  materialCare: z.string().max(2000).optional().default(''),
  fitDetails: z.string().max(2000).optional().default(''),
  shippingReturns: z.string().max(2000).optional().default(''),
  sizeGuide: z.string().max(2000).optional().default(''),
  productHighlights: z.array(z.string().max(160)).default([]),
  sortOrder: z.number().int().default(0),
  relatedProducts: z.array(objectIdSchema).default([]),
  recommendedProducts: z.array(objectIdSchema).default([]),
  weight: z.number().positive().max(100).optional(),
  dimensions: packageDimensionsSchema.optional(),
  packagingWeight: z.number().min(0).max(25).optional(),
  defaultPackagePreset: z.string().trim().max(80).optional(),
  maximumQuantityPerPackage: z.number().int().min(1).max(1_000).default(10),
  seo: z.object({ metaTitle: z.string().optional(), metaDesc: z.string().optional(), ogImage: z.string().url().optional() }).default({})
});
const validatePriceRelationship = (product: { basePrice?: number; comparePrice?: number }, context: z.RefinementCtx): void => {
  if (product.basePrice !== undefined && product.comparePrice !== undefined && product.comparePrice > 0 && product.comparePrice <= product.basePrice) {
    context.addIssue({ code: 'custom', path: ['comparePrice'], message: 'MRP must be greater than the selling price' });
  }
};
export const productBodySchema = productFieldsSchema.superRefine(validatePriceRelationship);
export const productUpdateSchema = productFieldsSchema.partial().superRefine(validatePriceRelationship);
export const productQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  collection: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  gender: z.enum(['men', 'women', 'unisex']).optional(),
  sale: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  bestseller: z.coerce.boolean().optional(),
  latestDrop: z.coerce.boolean().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  availability: z.enum(['all', 'in-stock', 'out-of-stock']).default('all'),
  sort: z.enum(['newest','price-asc','price-desc','best-selling','top-rated']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24)
}).strict();
export const adminProductQuerySchema = productQuerySchema.extend({
  status: z.enum(['all', 'visible', 'hidden', 'draft', 'archived']).default('all'),
  stock: z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']).default('all'),
  featured: z.enum(['all', 'yes', 'no']).default('all'),
  bestseller: z.enum(['all', 'yes', 'no']).default('all'),
  newArrival: z.enum(['all', 'yes', 'no']).default('all'),
  needsFix: z.enum(['all', 'yes']).default('all'),
  createdFrom: z.string().optional(),
  updatedFrom: z.string().optional(),
  pickupAddress: z.string().optional(),
  sort: z.enum(['updated', 'newest', 'oldest', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc', 'sales-desc', 'title-asc']).default('updated')
});
