// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const reviewBodySchema = z.object({ product: objectIdSchema, rating: z.number().int().min(1).max(5), title: z.string().min(2).max(100), body: z.string().min(8).max(1000), images: z.array(z.string().url()).default([]) });
export const reviewModerationSchema = z.object({ status: z.enum(['pending','approved','rejected']) });
