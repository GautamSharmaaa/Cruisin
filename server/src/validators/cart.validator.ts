// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const expectedVersionSchema = z.number().int().min(0).optional();
export const addCartItemSchema = z.object({ product: objectIdSchema, variant: objectIdSchema, quantity: z.number().int().min(1), expectedVersion: expectedVersionSchema });
export const updateCartItemSchema = z.object({ product: objectIdSchema, variant: objectIdSchema, quantity: z.number().int().min(1), expectedVersion: expectedVersionSchema });
export const syncCartSchema = z.object({ items: z.array(updateCartItemSchema.omit({ expectedVersion: true })).max(100), expectedVersion: expectedVersionSchema });
export const couponApplySchema = z.object({ code: z.string().min(2).max(40), expectedVersion: expectedVersionSchema });
export const couponRemoveSchema = z.object({ expectedVersion: expectedVersionSchema });
