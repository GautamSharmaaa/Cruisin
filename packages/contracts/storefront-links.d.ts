import type { z } from 'zod';
export interface StorefrontLink { label: string; href: string; }
export interface StorefrontLinks {
  brandHref: string;
  headerDepartmentLinksVisibility: 'home' | 'all' | 'hidden';
  landing: StorefrontLink[];
  men: StorefrontLink[];
  women: StorefrontLink[];
  menuUtilities: StorefrontLink[];
  footer: StorefrontLink[];
  policies: StorefrontLink[];
}
export const DEFAULT_STOREFRONT_LINKS: StorefrontLinks;
export const storefrontLinksSchema: z.ZodType<StorefrontLinks, Partial<StorefrontLinks>>;
