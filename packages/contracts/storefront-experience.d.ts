import type {z} from 'zod';
export interface StorefrontExperience {scrollBehavior:'smooth'|'native';pageTransitionsEnabled:boolean;galleryArrowsEnabled:boolean;galleryProgressEnabled:boolean;imageGradientEnabled:boolean;wishlistEnabled:boolean;wishlistAnimation:'pulse'|'none';menuAnimation:'slide'|'fade';pageLoader:'brand'|'none';motionPace:'calm'|'quick';}
export const storefrontExperienceSchema:z.ZodType<StorefrontExperience,Partial<StorefrontExperience>>;
export const DEFAULT_STOREFRONT_EXPERIENCE:StorefrontExperience;
