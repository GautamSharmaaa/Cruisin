// Governed by .rules v1.0
import { config } from 'dotenv';
import { z } from 'zod';

config();

const optionalSecret = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: optionalSecret,
  UPSTASH_REDIS_REST_URL: optionalSecret,
  UPSTASH_REDIS_REST_TOKEN: optionalSecret,
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 256 bits'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 256 bits'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  EMAIL_FROM: z.string().email().default('noreply@yourbrand.com'),
  GOOGLE_CLIENT_ID: optionalSecret,
  TWILIO_ACCOUNT_SID: optionalSecret,
  TWILIO_AUTH_TOKEN: optionalSecret,
  TWILIO_WHATSAPP_FROM: optionalSecret,
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: optionalSecret,
  SENTRY_DSN: z.string().optional()
}).superRefine((value, context) => {
  if (!value.REDIS_URL && (!value.UPSTASH_REDIS_REST_URL || !value.UPSTASH_REDIS_REST_TOKEN)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['REDIS_URL'], message: 'Provide REDIS_URL or both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN' });
  }
  if ((value.UPSTASH_REDIS_REST_URL && !value.UPSTASH_REDIS_REST_TOKEN) || (!value.UPSTASH_REDIS_REST_URL && value.UPSTASH_REDIS_REST_TOKEN)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['UPSTASH_REDIS_REST_URL'], message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be provided together' });
  }
  if (value.APP_ENV === 'development') return;
  const requiredIdentityVariables: Array<keyof typeof value> = [
    'GOOGLE_CLIENT_ID',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_FROM'
  ];
  for (const variable of requiredIdentityVariables) {
    if (!value[variable]) context.addIssue({ code: z.ZodIssueCode.custom, path: [variable], message: `${variable} is required in ${value.APP_ENV}` });
  }
  if (value.COOKIE_SAME_SITE === 'none' && value.NODE_ENV !== 'production') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['COOKIE_SAME_SITE'], message: 'SameSite=None cookies require NODE_ENV=production so Secure is enabled' });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
}

export const env = parsed.data;
