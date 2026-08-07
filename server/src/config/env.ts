// Governed by .rules v1.0
import { config } from 'dotenv';
import { z } from 'zod';

config();

const optionalSecret = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional());
const optionalString = z.preprocess((value) => value === '' ? undefined : value, z.string().trim().min(1).optional());
const envBoolean = (defaultValue: boolean) => z.preprocess((value) => {
  if (value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
}, z.boolean());

const mongoDetails = (uri: string): { database: string; hostname: string; protocol: string } | null => {
  try {
    const parsed = new URL(uri);
    return {
      database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
      hostname: parsed.hostname,
      protocol: parsed.protocol
    };
  } catch {
    return null;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
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
  RAZORPAY_WEBHOOK_SECRET: optionalSecret,
  PAYMENT_MODE: z.enum(['test', 'live']).default('test'),
  COD_ENABLED: envBoolean(false),
  COD_CHECKOUT_ENABLED: envBoolean(false),
  COD_FEE: z.coerce.number().min(0).default(0),
  PARTIAL_PAYMENT_ENABLED: z.coerce.boolean().default(false),
  PARTIAL_PAYMENT_PERCENTAGE: z.coerce.number().positive().max(100).optional(),
  PARTIAL_PAYMENT_FIXED_AMOUNT: z.coerce.number().positive().optional(),
  MAX_COD_ORDER_VALUE: z.coerce.number().positive().default(50000),
  MIN_PARTIAL_PAYMENT_ORDER_VALUE: z.coerce.number().min(0).default(0),
  STRIPE_SECRET_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  EMAIL_FROM: z.string().email().default('noreply@yourbrand.com'),
  GOOGLE_CLIENT_ID: optionalSecret,
  TWILIO_ACCOUNT_SID: optionalSecret,
  TWILIO_AUTH_TOKEN: optionalSecret,
  TWILIO_WHATSAPP_FROM: optionalSecret,
  TWILIO_WHATSAPP_CONTENT_SID: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^HX[0-9a-fA-F]{32}$/, 'TWILIO_WHATSAPP_CONTENT_SID must be a Twilio HX Content SID').optional()),
  TWILIO_SMS_FROM: optionalSecret,
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: optionalSecret,
  SENTRY_DSN: z.string().optional(),
  LOGISTICS_PROVIDER: z.literal('shiprocket').default('shiprocket'),
  SHIPROCKET_ENABLED: envBoolean(false),
  SHIPROCKET_MODE: z.enum(['mock', 'live-readonly', 'live']).default('mock'),
  SHIPROCKET_ALLOW_LIVE_READS: envBoolean(false),
  SHIPROCKET_ALLOW_LIVE_MUTATIONS: envBoolean(false),
  SHIPROCKET_BASE_URL: z.literal('https://apiv2.shiprocket.in/v1/external').default('https://apiv2.shiprocket.in/v1/external'),
  SHIPROCKET_API_EMAIL: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
  SHIPROCKET_API_PASSWORD: optionalSecret,
  SHIPROCKET_PICKUP_LOCATION: optionalString,
  SHIPROCKET_PICKUP_POSTCODE: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^[1-9]\d{5}$/).optional()),
  SHIPROCKET_WEBHOOK_SECRET: optionalSecret,
  SHIPROCKET_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(12_000),
  SHIPROCKET_TOKEN_REFRESH_BUFFER_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
  SHIPROCKET_AUTO_CREATE_ORDER: envBoolean(false),
  SHIPROCKET_AUTO_CREATE_COD_ORDER: envBoolean(false),
  SHIPROCKET_AUTO_ASSIGN_AWB: envBoolean(false),
  SHIPROCKET_AUTO_SCHEDULE_PICKUP: envBoolean(false),
  LOGISTICS_NOTIFICATIONS_ENABLED: envBoolean(true),
  LOGISTICS_EMAIL_NOTIFICATIONS_ENABLED: envBoolean(false),
  LOGISTICS_SMS_NOTIFICATIONS_ENABLED: envBoolean(false),
  LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED: envBoolean(false),
  LOGISTICS_DOCUMENT_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
  LOGISTICS_QUOTE_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
  LOGISTICS_PACKAGING_WEIGHT_KG: z.coerce.number().positive().max(25).default(0.1),
  LOGISTICS_WORKER_ENABLED: envBoolean(false),
  LOGISTICS_WORKER_POLL_MS: z.coerce.number().int().min(1_000).max(60_000).default(5_000)
}).superRefine((value, context) => {
  const mongo = mongoDetails(value.MONGODB_URI);
  if (!mongo || !['mongodb:', 'mongodb+srv:'].includes(mongo.protocol)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGODB_URI'], message: 'MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection string' });
  } else if (!mongo.database) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGODB_URI'], message: 'MONGODB_URI must include an explicit database name such as /cruisin' });
  }
  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_REFRESH_SECRET'], message: 'JWT access and refresh secrets must be different' });
  }
  if (!value.REDIS_URL && (!value.UPSTASH_REDIS_REST_URL || !value.UPSTASH_REDIS_REST_TOKEN)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['REDIS_URL'], message: 'Provide REDIS_URL or both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN' });
  }
  if ((value.UPSTASH_REDIS_REST_URL && !value.UPSTASH_REDIS_REST_TOKEN) || (!value.UPSTASH_REDIS_REST_URL && value.UPSTASH_REDIS_REST_TOKEN)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['UPSTASH_REDIS_REST_URL'], message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be provided together' });
  }
  if (value.SHIPROCKET_MODE === 'mock' && (value.SHIPROCKET_ALLOW_LIVE_READS || value.SHIPROCKET_ALLOW_LIVE_MUTATIONS)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_MODE'], message: 'Mock Shiprocket mode cannot allow live operations' });
  }
  if (value.SHIPROCKET_MODE === 'live-readonly' && value.SHIPROCKET_ALLOW_LIVE_MUTATIONS) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_ALLOW_LIVE_MUTATIONS'], message: 'Live-readonly Shiprocket mode cannot allow mutations' });
  }
  if (value.SHIPROCKET_ENABLED && value.SHIPROCKET_MODE !== 'mock') {
    if (!value.SHIPROCKET_API_EMAIL) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_API_EMAIL'], message: 'Shiprocket API email is required outside mock mode' });
    if (!value.SHIPROCKET_API_PASSWORD) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_API_PASSWORD'], message: 'Shiprocket API password is required outside mock mode' });
    if (!value.SHIPROCKET_PICKUP_LOCATION) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_PICKUP_LOCATION'], message: 'Shiprocket pickup location is required outside mock mode' });
    if (!value.SHIPROCKET_PICKUP_POSTCODE) context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_PICKUP_POSTCODE'], message: 'Shiprocket pickup postcode is required outside mock mode' });
  }
  if (value.SHIPROCKET_ENABLED && value.APP_ENV !== 'development' && !value.SHIPROCKET_WEBHOOK_SECRET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHIPROCKET_WEBHOOK_SECRET'], message: 'Shiprocket webhook secret is required outside development' });
  }
  if (value.LOGISTICS_SMS_NOTIFICATIONS_ENABLED && !value.TWILIO_SMS_FROM) context.addIssue({ code: z.ZodIssueCode.custom, path: ['TWILIO_SMS_FROM'], message: 'TWILIO_SMS_FROM is required when logistics SMS notifications are enabled' });
  if (value.LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED && !value.TWILIO_WHATSAPP_FROM) context.addIssue({ code: z.ZodIssueCode.custom, path: ['TWILIO_WHATSAPP_FROM'], message: 'TWILIO_WHATSAPP_FROM is required when logistics WhatsApp notifications are enabled' });
  if (value.APP_ENV === 'development') return;
  if (value.NODE_ENV !== 'production') context.addIssue({ code: z.ZodIssueCode.custom, path: ['NODE_ENV'], message: 'NODE_ENV must be production outside local development' });
  if (value.TRUST_PROXY < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['TRUST_PROXY'], message: 'TRUST_PROXY must be at least 1 behind Railway proxying' });
  if (mongo && (mongo.hostname === 'localhost' || mongo.hostname === '127.0.0.1')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGODB_URI'], message: 'MONGODB_URI must not target localhost outside development' });
  }
  if (mongo?.database === 'test') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGODB_URI'], message: 'Use an explicit application database instead of the MongoDB default test database' });
  }
  for (const [key, url] of [['CLIENT_URL', value.CLIENT_URL], ['ADMIN_URL', value.ADMIN_URL]] as const) {
    if (new URL(url).hostname === 'localhost' || new URL(url).hostname === '127.0.0.1') context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must be a deployed HTTPS origin outside development` });
    if (new URL(url).protocol !== 'https:') context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must use HTTPS outside development` });
  }
  if (!value.RAZORPAY_WEBHOOK_SECRET) context.addIssue({ code: z.ZodIssueCode.custom, path: ['RAZORPAY_WEBHOOK_SECRET'], message: 'RAZORPAY_WEBHOOK_SECRET is required outside development' });
  if (Boolean(value.STRIPE_SECRET_KEY) !== Boolean(value.STRIPE_WEBHOOK_SECRET)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['STRIPE_SECRET_KEY'], message: 'Provide both Stripe secrets or leave both unset' });
  if (value.APP_ENV === 'production' && value.PAYMENT_MODE !== 'live') context.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENT_MODE'], message: 'Production requires PAYMENT_MODE=live' });
  if (value.PAYMENT_MODE === 'live' && !value.RAZORPAY_KEY_ID.startsWith('rzp_live_')) context.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENT_MODE'], message: 'Live payment mode requires Razorpay live credentials' });
  if (value.PAYMENT_MODE === 'test' && !value.RAZORPAY_KEY_ID.startsWith('rzp_test_')) context.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYMENT_MODE'], message: 'Test payment mode requires Razorpay test credentials' });
  if (value.PARTIAL_PAYMENT_ENABLED && !value.PARTIAL_PAYMENT_PERCENTAGE && !value.PARTIAL_PAYMENT_FIXED_AMOUNT) context.addIssue({ code: z.ZodIssueCode.custom, path: ['PARTIAL_PAYMENT_PERCENTAGE'], message: 'Configure a partial payment percentage or fixed amount' });
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
  if (value.EMAIL_FROM.endsWith('@yourbrand.com')) context.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_FROM'], message: 'Configure a verified production EMAIL_FROM address' });
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
}

export const env = parsed.data;
