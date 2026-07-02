// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const breadcrumbItemSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(120)
});

const optionalUrlSchema = z.union([z.string().url(), z.literal('')]).optional();
const optionalMediaSchema = z.union([z.string().url(), z.string().regex(/^\/[^\s]+$/), z.literal('')]).optional();

export const categoryBodySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(120),
  path: z.string().min(2).max(260).optional(),
  parent: objectIdSchema.nullable().optional(),
  image: z.string().url(),
  description: z.string().max(1000).optional().default(''),
  heroTitle: z.string().max(160).optional().default(''),
  heroSubtitle: z.string().max(260).optional().default(''),
  heroImage: optionalUrlSchema.default(''),
  mobileHeroImage: optionalUrlSchema.default(''),
  bannerImage: optionalUrlSchema.default(''),
  mobileBannerImage: optionalUrlSchema.default(''),
  thumbnailImage: optionalUrlSchema.default(''),
  categoryCardImage: optionalUrlSchema.default(''),
  categoryVideo: optionalMediaSchema.default(''),
  mobileCategoryVideo: optionalMediaSchema.default(''),
  backgroundVideo: optionalMediaSchema.default(''),
  videoPosterImage: optionalUrlSchema.default(''),
  imageAltText: z.string().max(180).optional().default(''),
  videoAutoplay: z.boolean().default(true),
  videoMuted: z.boolean().default(true),
  videoLoop: z.boolean().default(true),
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
  sortOrder: z.number().int().default(0),
  bannerTitle: z.string().max(160).optional().default(''),
  bannerSubtitle: z.string().max(260).optional().default(''),
  defaultSort: z.enum(['newest', 'price-asc', 'price-desc', 'best-selling', 'top-rated']).default('newest'),
  defaultGridView: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(4),
  areFiltersVisible: z.boolean().default(true),
  isAdvancedFilterEnabled: z.boolean().default(true),
  isFlashlightEnabled: z.boolean().default(true),
  seoTitle: z.string().max(160).optional().default(''),
  seoDescription: z.string().max(260).optional().default(''),
  ogImage: optionalUrlSchema.default(''),
  canonicalSlug: z.string().max(160).optional().default(''),
  customContent: z.record(z.unknown()).nullable().optional(),
  breadcrumb: z.array(breadcrumbItemSchema).default([])
});

export const categorySortSchema = z.object({
  ids: z.array(objectIdSchema).min(1)
});
