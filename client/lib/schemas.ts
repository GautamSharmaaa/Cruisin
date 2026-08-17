// Governed by .rules v1.0
import { z } from 'zod';

export const e164PhoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, for example +919876543210');
const indiaCountrySchema = z.string().trim().transform((value): string => ['in', 'ind', 'india'].includes(value.toLowerCase()) ? 'India' : value).refine((value): boolean => value === 'India', 'Cruisin currently delivers only within India');
export const newsletterSchema = z.object({ email: z.string().email() });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const passwordSchema = z.string().min(8).max(128).regex(/[A-Z]/, 'Password needs uppercase').regex(/[0-9]/, 'Password needs a number');
export const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: passwordSchema, confirmPassword: passwordSchema }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const addressSchema = z.object({ fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: indiaCountrySchema });
export const savedAddressSchema = addressSchema.extend({ label: z.string().min(2), isDefault: z.boolean().default(false) });
const optionalE164PhoneSchema = z.preprocess((value) => value === '' ? undefined : value, e164PhoneSchema.optional());
const optionalNameSchema = z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().trim().min(2).optional());
const optionalEmailSchema = z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().email().optional());
export const profileSchema = z.object({ name: optionalNameSchema, email: optionalEmailSchema, phone: optionalE164PhoneSchema, whatsappNumber: optionalE164PhoneSchema });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match' });
export const checkoutSchema = z.object({ address: addressSchema, paymentMethod: z.enum(['razorpay','cod','partial']), shippingMethod: z.enum(['standard','express']) });
export const checkoutPageSchema = addressSchema.extend({ paymentMethod: z.enum(['razorpay','cod','partial']), shippingMethod: z.enum(['standard','express']) });
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), title: z.string().min(2), body: z.string().min(8) });
export const couponSchema = z.object({ code: z.string().min(2).max(40) });
export const otpRequestSchema = z.object({ phone: e164PhoneSchema, channel: z.literal('whatsapp') });
export const otpVerifySchema = z.object({ requestId: z.string().min(12), otp: z.string().regex(/^\d{6}$/, 'Enter the six digit code') });
export const addressBookSchema = z.object({ type: z.enum(['home', 'office', 'other']), fullName: z.string().min(2), phone: z.string().min(7), country: z.string().min(2), state: z.string().min(2), city: z.string().min(2), pincode: z.string().min(3), street: z.string().min(2), landmark: z.string().optional(), isDefault: z.boolean().default(false) });
