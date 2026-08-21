// Governed by .rules v1.0
import { z } from 'zod';
import { normalizeIndiaCountry } from '../utils/india-address.js';

const indiaCountrySchema = z.string().trim().transform(normalizeIndiaCountry).refine((value): boolean => value === 'India', 'Cruisin currently delivers only within India');
const addressSchema = z.object({ fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: indiaCountrySchema });
export const checkoutSchema = z.object({ shippingAddress: addressSchema, billingAddress: addressSchema, paymentMethod: z.enum(['razorpay','stripe','cod']), paymentMode: z.enum(['online', 'cod', 'partial']).optional(), shippingMethod: z.enum(['standard', 'express']).default('standard'), logisticsQuoteId: z.string().uuid().optional(), couponCode: z.string().optional(), expectedCartVersion: z.number().int().min(0).optional(), idempotencyKey: z.string().uuid(), metaEventId: z.string().trim().regex(/^checkout:[a-zA-Z0-9:-]+$/).max(160).optional() });
export const paymentVerifySchema = z.object({ method: z.enum(['razorpay','stripe']), payload: z.record(z.unknown()) });
export const paymentFailureSchema = z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order ID'), providerOrderId: z.string().trim().min(8).max(160) });
export const paymentCancellationSchema = paymentFailureSchema;
export const orderStatusSchema = z.object({ status: z.enum(['pending','placed','confirmed','processing','shipped','delivered','cancelled','returned']), note: z.string().trim().max(500).optional(), trackingNumber: z.string().trim().max(120).optional() }).superRefine((value, context) => {
  if (value.status === 'cancelled' && (!value.note || value.note.length < 3)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'An admin cancellation note is required' });
});
export const customerCancellationSchema = z.object({
  reasonCode: z.enum(['changed_mind', 'wrong_item', 'delivery_too_slow', 'found_better_option', 'other']),
  details: z.string().trim().max(500).optional()
}).superRefine((value, context) => {
  if (value.reasonCode === 'other' && (!value.details || value.details.length < 10)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['details'], message: 'Please provide at least 10 characters explaining the cancellation' });
  }
});
export const refundSchema = z.object({ amount: z.number().positive(), reason: z.string().max(500).optional(), idempotencyKey: z.string().uuid() });
export const orderArchiveSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
export const orderPermanentDeleteSchema = z.object({ orderNumber: z.string().trim().min(1).max(120), reason: z.string().trim().min(3).max(500) }).strict();
