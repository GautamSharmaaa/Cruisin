// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const cmsSectionTypeSchema = z.enum([
  'announcement_bar',
  'hero_campaign',
  'video_landing',
  'mobile_media_landing',
  'image_carousel',
  'product_carousel',
  'hot_drop',
  'trending_now',
  'discount_banner',
  'category_editorial_grid',
  'lookbook_story',
  'brand_story',
  'fullscreen_collection_landing',
  'popup_campaign',
  'newsletter',
  'social_proof',
  'marquee_strip',
  'shop_the_look',
  'featured_collection',
  'limited_drop_timer',
  'recently_viewed',
  'best_sellers'
]);

export const cmsStatusSchema = z.enum(['draft', 'published', 'archived']);
const jsonRecordSchema = z.record(z.unknown()).default({});

export const bannerBodySchema = z.object({ title: z.string().min(2), subtitle: z.string().min(2), cta: z.object({ text: z.string().min(2), link: z.string().min(1) }), image: z.string().url(), mobileImage: z.string().url(), position: z.string().min(2), isActive: z.boolean().default(true), startDate: z.coerce.date(), endDate: z.coerce.date(), sortOrder: z.number().int().default(0) });

export const cmsPageBodySchema = z.object({
  slug: z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(2).max(160),
  status: cmsStatusSchema.default('draft'),
  seoTitle: z.string().max(180).optional().default(''),
  seoDescription: z.string().max(320).optional().default('')
});

export const cmsSectionBodySchema = z.object({
  pageTarget: z.string().min(1).max(180).default('home'),
  type: cmsSectionTypeSchema,
  title: z.string().min(2).max(180),
  subtitle: z.string().max(240).optional().default(''),
  description: z.string().max(1000).optional().default(''),
  content: jsonRecordSchema,
  styles: jsonRecordSchema,
  products: z.array(objectIdSchema).default([]),
  categories: z.array(objectIdSchema).default([]),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
  hideOnDesktop: z.boolean().default(false),
  hideOnMobile: z.boolean().default(false),
  status: cmsStatusSchema.default('draft'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const cmsReorderBodySchema = z.object({ ids: z.array(objectIdSchema).min(1) });
export const cmsRestoreBodySchema = z.object({ versionId: objectIdSchema });
export const cmsPreviewQuerySchema = z.object({ previewToken: z.string().optional(), includeInactive: z.coerce.boolean().default(false), scheduledAt: z.coerce.date().optional() });
export const cmsMediaBodySchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  alt: z.string().max(180).optional().default(''),
  desktopUrl: z.string().url().optional().or(z.literal('')).default(''),
  mobileUrl: z.string().url().optional().or(z.literal('')).default(''),
  posterUrl: z.string().url().optional().or(z.literal('')).default(''),
  cropFocus: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
  lazy: z.boolean().default(true)
});
