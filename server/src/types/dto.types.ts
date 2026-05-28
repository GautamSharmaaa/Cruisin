// Governed by .rules v1.0
import type { PaymentMethod } from './payment.types.js';
import type { UserRole } from './auth.types.js';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface ProductImageDto {
  url: string;
  alt: string;
  width: number;
  height: number;
  publicId?: string;
}

export interface ProductVariantDto {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  sku: string;
  price: number;
  stock: number;
  images: ProductImageDto[];
}

export interface ProductDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  richDescription: string;
  brand: string;
  category: string;
  images: ProductImageDto[];
  basePrice: number;
  comparePrice?: number;
  variants: ProductVariantDto[];
  tags: string[];
  isFeatured: boolean;
  ratings: { avg: number; count: number };
  seo: { metaTitle?: string; metaDesc?: string; ogImage?: string };
}

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

export interface OrderDto {
  id: string;
  user?: string;
  sessionId?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  trackingNumber?: string;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  isActive: boolean;
}

export interface ReviewDto {
  id: string;
  product: string;
  user: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  status: string;
}

export interface CmsSectionDto {
  id: string;
  title: string;
  subtitle: string;
  cta: { text: string; link: string };
  image: string;
  mobileImage: string;
  position: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminOverviewDto {
  revenue: number;
  orders: number;
  users: number;
  products: number;
  conversionRate: number;
}
