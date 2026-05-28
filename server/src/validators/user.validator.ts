// Governed by .rules v1.0
import { z } from 'zod';
import { userRoles } from '../types/auth.types.js';

export const userQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(userRoles).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const userAdminUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(7).max(24).optional(),
  role: z.enum(userRoles).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional()
});
