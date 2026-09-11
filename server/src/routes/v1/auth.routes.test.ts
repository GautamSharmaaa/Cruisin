import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
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
process.env.SENDGRID_API_KEY = 'test';

const { authService, identityProvider } = vi.hoisted(() => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    googleLogin: vi.fn(),
    adminGoogleLogin: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    requestOtp: vi.fn(),
    verifyOtp: vi.fn()
  },
  identityProvider: { verifyGoogleCredential: vi.fn() }
}));

vi.mock('../../services/auth.service.js', () => ({ AuthService: authService }));
vi.mock('../../services/identity-provider.service.js', () => ({ IdentityProviderService: identityProvider }));

let app: express.Express;

beforeAll(async () => {
  const { authRouter } = await import('./auth.routes.js');
  const { errorHandler } = await import('../../middleware/error.middleware.js');
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth API routes', () => {
  it('rejects SMS OTP requests before calling the service', async () => {
    const response = await request(app).post('/auth/otp/request').send({ phone: '+919876543210', channel: 'sms', purpose: 'login' });
    expect(response.status).toBe(400);
    expect(authService.requestOtp).not.toHaveBeenCalled();
  });

  it('returns channel-specific OTP request data', async () => {
    authService.requestOtp.mockResolvedValue({ requestId: '665f6d8403bd2edc93800000', channel: 'whatsapp', cooldownSeconds: 60, expiresAt: new Date(Date.now() + 300000).toISOString() });
    const response = await request(app).post('/auth/otp/request').send({ phone: '+919876543210', channel: 'whatsapp', purpose: 'login' });
    expect(response.status).toBe(201);
    expect(response.body.data.channel).toBe('whatsapp');
  });

  it('rotates the refresh cookie through the refresh endpoint', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'access-token', refreshToken: 'next-refresh-token' });
    const response = await request(app)
      .post('/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', 'refreshToken=current-refresh-token')
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe('access-token');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('isolates the admin refresh cookie from the storefront session', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'admin-access-token', refreshToken: 'next-admin-refresh-token' });
    const response = await request(app)
      .post('/auth/refresh')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', ['refreshToken=customer-refresh-token', 'adminRefreshToken=current-admin-refresh-token'])
      .send({});
    expect(response.status).toBe(200);
    expect(authService.refresh).toHaveBeenCalledWith('current-admin-refresh-token', expect.any(Object));
    expect(response.headers['set-cookie']?.[0]).toContain('adminRefreshToken=next-admin-refresh-token');
  });

  it('uses the admin-only Google login flow and admin refresh cookie', async () => {
    const credential = 'credential-'.padEnd(120, 'x');
    const identity = { providerUserId: 'google-admin-id', email: 'admin@cruisin.co.in', name: 'Cruisin Admin' };
    identityProvider.verifyGoogleCredential.mockResolvedValue(identity);
    authService.adminGoogleLogin.mockResolvedValue({
      user: { id: '665f6d8403bd2edc93800000', name: 'Cruisin Admin', email: identity.email, role: 'admin', isVerified: true },
      tokens: { accessToken: 'admin-google-access', refreshToken: 'admin-google-refresh' }
    });
    const response = await request(app)
      .post('/auth/google/admin')
      .set('Origin', 'http://localhost:3001')
      .send({ credential });
    expect(response.status).toBe(200);
    expect(authService.adminGoogleLogin).toHaveBeenCalledWith(identity, expect.any(Object));
    expect(response.body.data.user.role).toBe('admin');
    expect(response.headers['set-cookie']?.[0]).toContain('adminRefreshToken=admin-google-refresh');
  });

  it('rejects cookie-auth requests from an unknown origin', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .set('Origin', 'https://attacker.example')
      .set('Cookie', 'refreshToken=current-refresh-token')
      .send({});
    expect(response.status).toBe(403);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('rejects login CSRF from an unknown browser origin', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'qa@example.com', password: 'not-a-real-password' });
    expect(response.status).toBe(403);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('logs out using only the refresh cookie', async () => {
    authService.logout.mockResolvedValue(undefined);
    const response = await request(app)
      .post('/auth/logout')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', 'refreshToken=current-refresh-token');
    expect(response.status).toBe(200);
    expect(authService.logout).toHaveBeenCalledWith('current-refresh-token');
    expect(response.headers['set-cookie']?.[0]).toContain('refreshToken=');
  });
});
