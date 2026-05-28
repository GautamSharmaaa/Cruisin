// Governed by .rules v1.0
import { z } from 'zod';

const passwordSchema = z.string().min(8).max(128).regex(/[A-Z]/, 'Password needs uppercase').regex(/[0-9]/, 'Password needs a number');
export const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: passwordSchema });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const verifyEmailSchema = z.object({ token: z.string().min(32) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: passwordSchema });
export const refreshSchema = z.object({}).strict();
