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
