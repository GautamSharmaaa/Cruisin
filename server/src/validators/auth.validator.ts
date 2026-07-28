// Governed by .rules v1.0
import { z } from 'zod';
import { E164_PHONE_PATTERN } from '../utils/phone.js';

const passwordSchema = z.string().min(8).max(128).regex(/[A-Z]/, 'Password needs uppercase').regex(/[0-9]/, 'Password needs a number');
const phoneSchema = z.string().trim().regex(E164_PHONE_PATTERN, 'Use international format, for example +919876543210');
export const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: passwordSchema });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const verifyEmailSchema = z.object({ token: z.string().min(32) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: passwordSchema });
export const refreshSchema = z.object({}).strict();
export const profileUpdateSchema = z.object({ name: z.string().min(2).max(80).optional(), email: z.string().email().optional(), phone: phoneSchema.optional(), whatsappNumber: phoneSchema.optional(), gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(), dateOfBirth: z.coerce.date().optional(), avatar: z.string().url().optional() });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), password: passwordSchema });
export const addressSchema = z.object({ label: z.string().min(2), fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2), isDefault: z.boolean().default(false) });
export const googleLoginSchema = z.object({ credential: z.string().min(100) });
export const otpRequestSchema = z.object({ phone: phoneSchema, channel: z.literal('whatsapp'), purpose: z.enum(['login', 'link_account', 'verify_phone']).default('login'), deviceFingerprint: z.string().max(160).optional() });
export const otpVerifySchema = z.object({ requestId: z.string().min(12), otp: z.string().regex(/^\d{6}$/, 'OTP must be six digits'), deviceFingerprint: z.string().max(160).optional() });
export const addressBookSchema = z.object({ type: z.enum(['home', 'office', 'other']).default('home'), fullName: z.string().min(2), phone: z.string().min(7), country: z.string().min(2), state: z.string().min(2), city: z.string().min(2), pincode: z.string().min(3), street: z.string().min(2), landmark: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional(), isDefault: z.boolean().default(false) });
export const preferenceSchema = z.object({ language: z.string().min(2).max(8).optional(), currency: z.string().min(3).max(3).optional(), theme: z.enum(['dark']).optional(), marketingEmails: z.boolean().optional(), orderEmails: z.boolean().optional(), pushNotifications: z.boolean().optional(), smsNotifications: z.boolean().optional(), whatsappNotifications: z.boolean().optional() });
