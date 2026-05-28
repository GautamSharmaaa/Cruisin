// Governed by .rules v1.0
import { z } from 'zod';

const passwordSchema = z.string().min(8).max(128).regex(/[A-Z]/, 'Password needs uppercase').regex(/[0-9]/, 'Password needs a number');
export const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: passwordSchema });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const verifyEmailSchema = z.object({ token: z.string().min(32) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: passwordSchema });
export const refreshSchema = z.object({}).strict();
export const profileUpdateSchema = z.object({ name: z.string().min(2).max(80).optional(), email: z.string().email().optional(), phone: z.string().min(7).max(24).optional(), avatar: z.string().url().optional() });
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), password: passwordSchema });
export const addressSchema = z.object({ label: z.string().min(2), fullName: z.string().min(2), phone: z.string().min(7), line1: z.string().min(2), line2: z.string().optional(), city: z.string().min(2), state: z.string().min(2), postalCode: z.string().min(3), country: z.string().min(2), isDefault: z.boolean().default(false) });
