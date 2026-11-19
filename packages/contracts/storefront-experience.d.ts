import type { ZodType } from 'zod';
export const collectionFilterGroups: readonly ['size', 'availability', 'price', 'type', 'color', 'collection', 'gender', 'sale'];
export type CollectionFilterGroup = (typeof collectionFilterGroups)[number];

export interface StorefrontExperience {
  scrollBehavior: 'smooth' | 'native';
  pageTransitionsEnabled: boolean;
  hideHeaderOnScroll: boolean;
  mobilePurchaseDockEnabled: boolean;
  galleryArrowsEnabled: boolean;
  galleryProgressEnabled: boolean;
  imageGradientEnabled: boolean;
  wishlistEnabled: boolean;
  wishlistAnimation: 'pulse' | 'none';
  menuAnimation: 'slide' | 'fade';
  pageLoader: 'brand' | 'none';
  loaderMark: 'wordmark' | 'diamond';
  loaderText: string;
  loaderTone: 'theme' | 'light' | 'dark';
  loaderAccent?: string;
  collectionAutoLoad: boolean;
  collectionSortVisible: boolean;
  collectionWindowVisible: boolean;
  collectionFilters: CollectionFilterGroup[];
  motionPace: 'calm' | 'quick';
}
export const storefrontExperienceSchema: ZodType<StorefrontExperience>;
export const DEFAULT_STOREFRONT_EXPERIENCE: StorefrontExperience;
