// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const addCartItemSchema = z.object({ product: objectIdSchema, variant: objectIdSchema, quantity: z.number().int().min(1).max(20) });
export const updateCartItemSchema = z.object({ product: objectIdSchema, variant: objectIdSchema, quantity: z.number().int().min(1).max(20) });
export const couponApplySchema = z.object({ code: z.string().min(2).max(40) });
