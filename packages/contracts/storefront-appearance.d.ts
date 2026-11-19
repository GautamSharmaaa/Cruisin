import type { z } from 'zod';
export interface StorefrontAppearance { cruisinRingFinish: 'chrome' | 'color'; cruisinRingColorLight: string; cruisinRingColorDark: string; }
export const DEFAULT_STOREFRONT_APPEARANCE: StorefrontAppearance;
export const storefrontColorSchema: z.ZodType<string>;
export const storefrontAppearanceSchema: z.ZodObject<{ cruisinRingFinish: z.ZodDefault<z.ZodEnum<{ chrome: 'chrome'; color: 'color' }>>; cruisinRingColorLight: z.ZodDefault<typeof storefrontColorSchema>; cruisinRingColorDark: z.ZodDefault<typeof storefrontColorSchema> }>;
