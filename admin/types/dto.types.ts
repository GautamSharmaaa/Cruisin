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
  basePrice: number;
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
  paymentStatus: string;
  orderStatus: string;
  total: number;
  createdAt?: string;
  trackingNumber?: string;
}

export interface CmsSectionDto {
  id: string;
  title: string;
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
