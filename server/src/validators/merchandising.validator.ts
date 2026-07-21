// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './common.validator.js';

const optionalUrlSchema = z.union([z.string().url(), z.literal('')]).optional();
const optionalMediaSchema = z.union([z.string().url(), z.string().regex(/^\/[^\s]+$/), z.literal('')]).optional();
const gridViewSchema = z.union([z.literal(1), z.literal(2), z.literal(4)]);
const sortSchema = z.enum(['newest', 'price-asc', 'price-desc', 'best-selling', 'top-rated']);
const menuLayoutSchema = z.enum(['text-columns', 'collection-grid', 'custom-link']);
const menuLinkTypeSchema = z.enum(['category', 'subcategory', 'collection', 'product_listing', 'static_page', 'custom_url']);

export const navigationItemBodySchema = z.object({
  label: z.string().min(2).max(80),
  slug: z.string().min(2).max(100),
  href: z.string().min(1).max(240),
  type: z.enum(['simple_link', 'mega_menu', 'collection_link', 'category_link', 'custom_url']).default('mega_menu'),
  menuLayoutType: menuLayoutSchema.default('text-columns'),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  isMegaMenuEnabled: z.boolean().default(true),
  isDefaultActive: z.boolean().default(false)
});

export const navigationSortSchema = z.object({ ids: z.array(objectIdSchema).min(1) });

export const megaMenuColumnBodySchema = z.object({
  navItemId: objectIdSchema,
  title: z.string().min(2).max(80),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true)
});

export const megaMenuLinkBodySchema = z.object({
  columnId: objectIdSchema,
  label: z.string().min(2).max(100),
  href: z.string().min(1).max(260),
  linkedType: menuLinkTypeSchema.default('custom_url'),
  linkedId: objectIdSchema.nullable().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  isHighlighted: z.boolean().default(false),
  showArrow: z.boolean().default(false)
});

export const megaMenuCollectionCardBodySchema = z.object({
  navItemId: objectIdSchema,
  collectionId: objectIdSchema.nullable().optional(),
  titleOverride: z.string().max(120).optional().default(''),
  slugOverride: z.string().max(140).optional().default(''),
  imageOverride: optionalUrlSchema.default(''),
  mobileImageOverride: optionalUrlSchema.default(''),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true)
});

export const megaMenuPromoBodySchema = z.object({
  navItemId: objectIdSchema,
  eyebrow: z.string().max(80).optional().default(''),
  title: z.string().max(120).optional().default(''),
  subtitle: z.string().max(240).optional().default(''),
  image: optionalUrlSchema.default(''),
  mobileImage: optionalUrlSchema.default(''),
  buttonLabel: z.string().max(80).optional().default(''),
  buttonHref: z.string().max(260).optional().default(''),
  overlayOpacity: z.number().min(0).max(0.9).default(0.45),
  showOnDesktop: z.boolean().default(true),
  showOnMobile: z.boolean().default(true),
  isVisible: z.boolean().default(true)
});

export const megaMenuQuerySchema = z.object({
  navItemId: objectIdSchema.optional(),
  columnId: objectIdSchema.optional()
});

export const collectionBodySchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  description: z.string().max(1600).optional().default(''),
  heroTitle: z.string().max(160).optional().default(''),
  heroSubtitle: z.string().max(320).optional().default(''),
  heroImage: optionalUrlSchema.default(''),
  mobileHeroImage: optionalUrlSchema.default(''),
  cardImage: optionalUrlSchema.default(''),
  thumbnailImage: optionalUrlSchema.default(''),
  bannerImage: optionalUrlSchema.default(''),
  mobileBannerImage: optionalUrlSchema.default(''),
  mobileImage: optionalUrlSchema.default(''),
  collectionVideo: optionalMediaSchema.default(''),
  mobileCollectionVideo: optionalMediaSchema.default(''),
  backgroundVideo: optionalMediaSchema.default(''),
  videoPosterImage: optionalUrlSchema.default(''),
  imageAltText: z.string().max(180).optional().default(''),
  isBannerVisible: z.boolean().default(false),
  productIds: z.array(objectIdSchema).default([]),
  categoryIds: z.array(objectIdSchema).default([]),
  tags: z.array(z.string().min(1).max(80)).default([]),
  productSortOrder: z.record(z.unknown()).default({}),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInMenu: z.boolean().default(true),
  menuCardImage: optionalUrlSchema.default(''),
  mobileMenuCardImage: optionalUrlSchema.default(''),
  menuCardTitleOverride: z.string().max(120).optional().default(''),
  menuCardOrder: z.number().int().default(0),
  defaultSort: sortSchema.default('newest'),
  defaultGridView: gridViewSchema.default(4),
  areFiltersVisible: z.boolean().default(true),
  isAdvancedFilterEnabled: z.boolean().default(true),
  isFlashlightEnabled: z.boolean().default(true),
  seoTitle: z.string().max(160).optional().default(''),
  seoDescription: z.string().max(260).optional().default(''),
  ogImage: optionalUrlSchema.default('')
});

export const pageSettingsBodySchema = z.object({
  pageType: z.string().min(2).max(80),
  pageSlug: z.string().min(1).max(160),
  title: z.string().min(2).max(160),
  subtitle: z.string().max(320).optional().default(''),
  heroImage: optionalUrlSchema.default(''),
  mobileHeroImage: optionalUrlSchema.default(''),
  heroVideo: optionalMediaSchema.default(''),
  mobileHeroVideo: optionalMediaSchema.default(''),
  bannerImage: optionalUrlSchema.default(''),
  mobileBannerImage: optionalUrlSchema.default(''),
  bannerVideo: optionalMediaSchema.default(''),
  mobileBannerVideo: optionalMediaSchema.default(''),
  videoPosterImage: optionalUrlSchema.default(''),
  ctaText: z.string().max(80).optional().default(''),
  ctaLink: z.string().max(260).optional().default(''),
  isBannerVisible: z.boolean().default(false),
  defaultSort: sortSchema.default('newest'),
  defaultGridView: gridViewSchema.default(4),
  areFiltersVisible: z.boolean().default(true),
  isAdvancedFilterEnabled: z.boolean().default(true),
  isFlashlightEnabled: z.boolean().default(true),
  seoTitle: z.string().max(160).optional().default(''),
  seoDescription: z.string().max(260).optional().default(''),
  ogImage: optionalUrlSchema.default(''),
  isPublished: z.boolean().default(true),
  sectionVisibility: z.record(z.unknown()).default({}),
  customSections: z.array(z.record(z.unknown())).default([])
});

export const pageSettingsQuerySchema = paginationQuerySchema.extend({
  pageType: z.string().optional(),
  pageSlug: z.string().optional()
});

export const pageSettingsParamSchema = z.object({
  pageType: z.string().min(2).max(80),
  pageSlug: z.string().min(1).max(160).optional()
});

export const siteSettingsBodySchema = z.object({
  defaultGridView: gridViewSchema.default(4),
  isFlashlightEnabled: z.boolean().default(true),
  isCollectionCarouselEnabled: z.boolean().default(true),
  isAdvancedFilterEnabled: z.boolean().default(true),
  isListingHeroMediaEnabled: z.boolean().default(true),
  isStorefrontNavigationVisible: z.boolean().default(true),
  standardShippingRate: z.number().min(0).max(100_000).default(900),
  expressShippingRate: z.number().min(0).max(100_000).default(1800),
  freeStandardShippingThreshold: z.number().min(0).max(1_000_000).default(25_000),
  standardShippingCompareAt: z.number().min(0).max(100_000).default(0),
  globalFilterSettings: z.record(z.unknown()).default({})
});

export const tagBodySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(100),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
});
