import { describe, expect, it } from 'vitest';
import { assertV2Isolation } from './v2-isolation.js';

const safe = {
  APP_ENV: 'development', MONGODB_URI: 'mongodb://127.0.0.1:27983/cruisin-v2-local',
  REDIS_URL: 'redis://127.0.0.1:6392/0', RAZORPAY_KEY_ID: 'rzp_test_placeholder'
};

describe('V2 environment boundary before connecting', () => {
  it('accepts local isolated targets', () => { expect(() => assertV2Isolation(safe)).not.toThrow(); });
  for (const [key, value] of [
    ['MONGODB_URI', 'mongodb+srv://fake.example/cruisin-v2-local'],
    ['MONGODB_URI', 'mongodb://127.0.0.1:27983/cruisin'],
    ['MONGODB_URI', 'mongodb://127.0.0.1:27983/cruisin-production'],
    ['REDIS_URL', 'redis://fake.example:6379/0'],
    ['RAZORPAY_KEY_ID', 'rzp_live_fake'], ['PAYMENT_MODE', 'live'],
    ['SENDGRID_API_KEY', 'SG.fake-production'], ['SHIPROCKET_ALLOW_LIVE_MUTATIONS', 'true'],
    ['TWILIO_AUTH_TOKEN', 'fake-production'], ['APP_ENV', 'production']
  ]) it(`rejects unsafe ${key}: ${value}`, () => { expect(() => assertV2Isolation({ ...safe, [key]: value })).toThrow(); });
  it('requires explicit staging targets', () => { expect(() => assertV2Isolation({ ...safe, APP_ENV: 'staging' })).toThrow(); });
});
