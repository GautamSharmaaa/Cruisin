// Governed by .rules v1.0
import { z } from 'zod';

const addressSchema = z.object({ fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2) });
export const checkoutSchema = z.object({ shippingAddress: addressSchema, billingAddress: addressSchema, paymentMethod: z.enum(['razorpay','stripe','cod']), paymentMode: z.enum(['online', 'cod', 'partial']).optional(), couponCode: z.string().optional() });
export const paymentVerifySchema = z.object({ method: z.enum(['razorpay','stripe']), payload: z.record(z.unknown()) });
export const orderStatusSchema = z.object({ status: z.enum(['pending','placed','confirmed','processing','shipped','delivered','cancelled','returned']), note: z.string().optional(), trackingNumber: z.string().optional() });
export const refundSchema = z.object({ amount: z.number().positive(), reason: z.string().max(500).optional() });
