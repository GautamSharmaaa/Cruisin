// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const couponBodySchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['percentage', 'fixed', 'freeShipping']),
  value: z.number().min(0),
  minOrderValue: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  usedCount: z.number().int().min(0).default(0),
  userUsageLimit: z.number().int().min(1).default(1),
  applicableProducts: z.array(objectIdSchema).default([]),
  applicableCategories: z.array(objectIdSchema).default([]),
  isActive: z.boolean().default(true),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date()
});
