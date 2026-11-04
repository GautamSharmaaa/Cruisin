import { createHash } from 'node:crypto';

type Environment = Record<string, string | undefined>;

// Nonproduction is deliberately limited to synthetic provider credentials.
// Staging provider onboarding must be reviewed before relaxing this policy.
export const assertV2Isolation = (value: Environment): void => {
  const appEnvironment = value.APP_ENV ?? 'development';
  if (appEnvironment === 'production') {
    if (value.CRUISIN_PRODUCTION_RELEASE_APPROVED !== 'true') throw new Error('V2 production release is not approved');
    return;
  }
  const reject = (reason: string): never => { throw new Error(`V2 isolation rejected configuration: ${reason}`); };
  const mongo = new URL(value.MONGODB_URI ?? 'invalid:');
  const database = decodeURIComponent(mongo.pathname.replace(/^\/+/, ''));
  const local = ['127.0.0.1', 'localhost'].includes(mongo.hostname);
  if (!['mongodb:', 'mongodb+srv:'].includes(mongo.protocol) || !/^cruisin[-_].+/.test(database) || /(^|[-_])(prod|production)([-_]|$)/i.test(database)) reject('MongoDB requires a dedicated nonproduction database');
  if (appEnvironment === 'staging') {
    if (!value.V2_STAGING_MONGODB_HOST || mongo.hostname !== value.V2_STAGING_MONGODB_HOST || database !== 'cruisin-v2-staging') reject('staging MongoDB must match its explicit host and database');
    if (createHash('sha256').update(mongo.hostname).digest('hex') === PRODUCTION_MONGO_HOST_HASH) reject('production MongoDB host');
  } else if (!local || mongo.protocol !== 'mongodb:') reject('local development and tests require loopback MongoDB');
  if (mongo.searchParams.get('replicaSet') && !local && appEnvironment !== 'staging') reject('remote replica set');
  const redis = new URL(value.REDIS_URL ?? 'invalid:');
  const redisHost = appEnvironment === 'staging' ? value.V2_STAGING_REDIS_HOST : undefined;
  if (!['redis:', 'rediss:'].includes(redis.protocol) || (appEnvironment === 'staging' ? !redisHost || redis.hostname !== redisHost : !['localhost', '127.0.0.1'].includes(redis.hostname))) reject('Redis target is not isolated');
  if (value.UPSTASH_REDIS_REST_URL || value.UPSTASH_REDIS_REST_TOKEN) reject('Upstash is disabled in V2 nonproduction');
  if ((value.PAYMENT_MODE ?? 'test') !== 'test' || !value.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) reject('test payment mode and keys required');
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'RAZORPAY_KEY_SECRET', 'SENDGRID_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const) {
    const secret = value[key];
    if (secret && !/^(test($|[-_])|SG\.test($|[-_]))/.test(secret)) reject(`${key} requires a synthetic value until provider onboarding`);
  }
  for (const key of ['SHIPROCKET_API_EMAIL', 'SHIPROCKET_API_PASSWORD', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'GOOGLE_CLIENT_ID', 'SENTRY_DSN'] as const) if (value[key]) reject(`${key} must be absent`);
  for (const key of ['SHIPROCKET_ALLOW_LIVE_READS', 'SHIPROCKET_ALLOW_LIVE_DOCUMENTS', 'SHIPROCKET_ALLOW_LIVE_MUTATIONS', 'SHIPROCKET_AUTO_CREATE_ORDER', 'SHIPROCKET_AUTO_CREATE_COD_ORDER', 'SHIPROCKET_AUTO_ASSIGN_AWB', 'SHIPROCKET_AUTO_SCHEDULE_PICKUP', 'LOGISTICS_WORKER_ENABLED', 'LOGISTICS_EMAIL_NOTIFICATIONS_ENABLED', 'LOGISTICS_SMS_NOTIFICATIONS_ENABLED', 'LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED', 'RAZORPAYX_ENABLED'] as const) if (value[key] === 'true') reject(`${key} is disabled`);
  if (value.SHIPROCKET_MODE && value.SHIPROCKET_MODE !== 'mock') reject('Shiprocket must use mock mode');
};

const PRODUCTION_MONGO_HOST_HASH = '1ac8004dd4b8e53584a9db0afd71f248223afff7ffff5a0b52c596e0b71c85bc';
