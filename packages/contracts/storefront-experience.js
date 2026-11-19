import { z } from 'zod';

export const collectionFilterGroups = ['size', 'availability', 'price', 'type', 'color', 'collection', 'gender', 'sale'];
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const storefrontExperienceSchema = z.object({
  scrollBehavior: z.enum(['smooth', 'native']).default('smooth'),
  pageTransitionsEnabled: z.boolean().default(true),
  hideHeaderOnScroll: z.boolean().default(true),
  mobilePurchaseDockEnabled: z.boolean().default(true),
  galleryArrowsEnabled: z.boolean().default(true),
  galleryProgressEnabled: z.boolean().default(true),
  imageGradientEnabled: z.boolean().default(true),
  wishlistEnabled: z.boolean().default(true),
  wishlistAnimation: z.enum(['pulse', 'none']).default('pulse'),
  menuAnimation: z.enum(['slide', 'fade']).default('slide'),
  pageLoader: z.enum(['brand', 'none']).default('brand'),
  loaderMark: z.enum(['wordmark', 'diamond']).default('wordmark'),
  loaderText: z.string().trim().max(60).default(''),
  loaderTone: z.enum(['theme', 'light', 'dark']).default('theme'),
  loaderAccent: hex.optional(),
  collectionAutoLoad: z.boolean().default(true),
  collectionSortVisible: z.boolean().default(true),
  collectionWindowVisible: z.boolean().default(true),
  collectionFilters: z.array(z.enum(collectionFilterGroups)).max(collectionFilterGroups.length).default(collectionFilterGroups),
  motionPace: z.enum(['calm', 'quick']).default('calm')
}).strict();

export const DEFAULT_STOREFRONT_EXPERIENCE = storefrontExperienceSchema.parse({});
