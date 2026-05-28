// Governed by .rules v1.0
import { z } from 'zod';

export const newsletterSchema = z.object({ email: z.string().email() });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const addressSchema = z.object({ fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2) });
export const savedAddressSchema = addressSchema.extend({ label: z.string().min(2), isDefault: z.boolean().default(false) });
export const profileSchema = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(7).optional() });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const checkoutSchema = z.object({ address: addressSchema, paymentMethod: z.enum(['razorpay','stripe']), shippingMethod: z.enum(['standard','express']) });
export const checkoutPageSchema = addressSchema.extend({ paymentMethod: z.enum(['razorpay','stripe']), shippingMethod: z.enum(['standard','express']) });
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), title: z.string().min(2), body: z.string().min(8) });
export const couponSchema = z.object({ code: z.string().min(2).max(40) });
