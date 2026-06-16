// Governed by .rules v1.0
import type { Product } from './product.types';
import type { User } from './user.types';

export type UserDto = User;
export type ProductDto = Product;

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  parent?: string | null;
  image: string;
  isActive: boolean;
  sortOrder: number;
  breadcrumb: Array<{ name: string; slug: string }>;
}

export interface CartDto {
  id?: string;
  items: Array<{ product: ProductDto | string; variant: string; quantity: number; price: number }>;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  isActive: boolean;
}

export interface CmsSectionDto {
  id: string;
  _id?: string;
  pageId?: string;
  pageTarget?: string;
  type?: CmsSectionType;
  title: string;
  subtitle?: string;
  description?: string;
  cta?: { text: string; link: string };
  image?: string;
  mobileImage?: string;
  position?: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  products?: ProductDto[];
  categories?: CategoryDto[];
  isActive?: boolean;
  active?: boolean;
  hideOnDesktop?: boolean;
  hideOnMobile?: boolean;
  status?: CmsStatus;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}

export type CmsSectionType = 'announcement_bar' | 'hero_campaign' | 'video_landing' | 'image_carousel' | 'product_carousel' | 'hot_drop' | 'trending_now' | 'discount_banner' | 'category_editorial_grid' | 'lookbook_story' | 'brand_story' | 'fullscreen_collection_landing' | 'popup_campaign' | 'newsletter' | 'social_proof' | 'marquee_strip';
export type CmsStatus = 'draft' | 'published' | 'archived';

export interface CmsPageDto {
  id?: string;
  _id?: string;
  slug: string;
  title: string;
  status: CmsStatus;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CmsExperienceDto {
  page: CmsPageDto | null;
  sections: CmsSectionDto[];
  preview: boolean;
}

export interface AdminOverviewDto {
  revenue: number;
  orders: number;
  users: number;
  products: number;
  conversionRate: number;
}
