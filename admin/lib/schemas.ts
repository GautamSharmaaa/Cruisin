// Governed by .rules v1.0
import { z } from 'zod';

export const adminProductSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  richDescription: z.string().min(10),
  category: z.string().regex(/^[a-f\d]{24}$/i),
  basePrice: z.coerce.number().min(0),
  comparePrice: z.coerce.number().min(0).optional(),
  sku: z.string().min(2),
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  stock: z.coerce.number().int().min(0),
  image: z.string().url()
});

export const adminCouponSchema = z.object({
  code: z.string().min(2),
  type: z.enum(['percentage', 'fixed', 'freeShipping']),
  value: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  userUsageLimit: z.coerce.number().int().min(1).default(1),
  validFrom: z.string().min(4),
  validUntil: z.string().min(4)
});

export const adminCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  image: z.string().url(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true)
});

export const adminOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  note: z.string().max(240).optional(),
  trackingNumber: z.string().max(80).optional()
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['customer', 'admin', 'superadmin', 'manager', 'viewer']),
  isActive: z.enum(['true', 'false'])
});

export const adminBannerSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().min(2),
  ctaText: z.string().min(2),
  ctaLink: z.string().min(1),
  image: z.string().url(),
  mobileImage: z.string().url(),
  position: z.string().min(2),
  startDate: z.string().min(4),
  endDate: z.string().min(4),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true)
});
