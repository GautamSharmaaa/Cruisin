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
  validFrom: z.string().min(4),
  validUntil: z.string().min(4)
});
