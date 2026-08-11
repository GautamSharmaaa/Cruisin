import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'test';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';

describe('refresh token verification', () => {
  it('returns the trusted authentication payload for a valid token', async () => {
    const { generateRefreshToken, verifyRefreshToken } = await import('./generate-token.js');
    const payload = { userId: 'user-1', email: 'member@example.com', role: 'customer' as const };

    expect(verifyRefreshToken(generateRefreshToken(payload))).toEqual(payload);
  });

  it('maps invalid signatures to an authentication error', async () => {
    const { verifyRefreshToken } = await import('./generate-token.js');

    expect(() => verifyRefreshToken('invalid.refresh.token')).toThrow(expect.objectContaining({
      statusCode: 401,
      message: 'Refresh token invalid or expired'
    }));
  });
});
