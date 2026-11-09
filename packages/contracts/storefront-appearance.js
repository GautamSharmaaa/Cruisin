import { z } from 'zod';
export const DEFAULT_STOREFRONT_APPEARANCE = { cruisinRingColorLight: '#f58032', cruisinRingColorDark: '#f86a1b' };
export const storefrontColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color, for example #f58032.').transform(value => value.toLowerCase());
export const storefrontAppearanceSchema = z.object({
  cruisinRingColorLight: storefrontColorSchema.default(DEFAULT_STOREFRONT_APPEARANCE.cruisinRingColorLight),
  cruisinRingColorDark: storefrontColorSchema.default(DEFAULT_STOREFRONT_APPEARANCE.cruisinRingColorDark),
});
