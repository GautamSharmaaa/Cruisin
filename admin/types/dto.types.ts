// Governed by .rules v1.0
export interface UserDto {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer';
  isVerified: boolean;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  richDescription?: string;
  category?: string;
  images?: Array<{ url: string; alt: string; width: number; height: number }>;
  basePrice: number;
  comparePrice?: number;
  variants?: Array<{ sku: string; size: string; color: string; colorHex: string; price: number; stock: number; images?: Array<{ url: string; alt: string; width: number; height: number }> }>;
  isActive: boolean;
  isFeatured: boolean;
}

export interface CategoryDto {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface CouponDto {
  id: string;
  _id?: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface OrderDto {
  id: string;
  _id?: string;
  user?: string;
  sessionId?: string;
  items?: Array<{ title: string; sku: string; quantity: number; price: number; image?: string }>;
  shippingAddress?: { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  billingAddress?: { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  paymentMethod?: 'razorpay' | 'stripe';
  paymentStatus: string;
  orderStatus: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  createdAt?: string;
  trackingNumber?: string;
  timeline?: Array<{ status: string; timestamp: string; note?: string }>;
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
  position: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  products?: ProductDto[] | string[];
  categories?: CategoryDto[] | string[];
  isActive: boolean;
  active?: boolean;
  hideOnDesktop?: boolean;
  hideOnMobile?: boolean;
  status?: CmsStatus;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
  publishedVersionId?: string;
  previewToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsVersionDto {
  id?: string;
  _id?: string;
  pageId: string;
  sectionsSnapshot: CmsSectionDto[];
  status: 'draft' | 'published' | 'restored';
  label?: string;
  createdAt?: string;
}

export interface CmsMediaDto {
  id?: string;
  _id?: string;
  url: string;
  type: 'image' | 'video';
  alt?: string;
  desktopUrl?: string;
  mobileUrl?: string;
  posterUrl?: string;
  cropFocus?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  lazy?: boolean;
}

export interface AdminOverviewDto {
  revenue: number;
  orders: number;
  users: number;
  products: number;
  conversionRate: number;
}

export interface AdminAnalyticsPointDto {
  day: string;
  revenue: number;
  orders: number;
}
