// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const breadcrumbItemSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(120)
});

export const categoryBodySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(120),
  parent: objectIdSchema.nullable().optional(),
  image: z.string().url(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  breadcrumb: z.array(breadcrumbItemSchema).default([])
});

export const categorySortSchema = z.object({
  ids: z.array(objectIdSchema).min(1)
});
