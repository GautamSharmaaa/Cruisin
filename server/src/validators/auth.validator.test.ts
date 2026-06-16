import { describe, expect, it } from 'vitest';
import { otpRequestSchema, otpVerifySchema, registerSchema } from './auth.validator.js';

describe('auth validators', () => {
  it('accepts canonical E.164 WhatsApp numbers', () => {
    expect(otpRequestSchema.safeParse({ phone: '+919876543210', channel: 'whatsapp' }).success).toBe(true);
  });

  it('rejects SMS channel, local numbers, and malformed phone numbers', () => {
    expect(otpRequestSchema.safeParse({ phone: '+919876543210', channel: 'sms' }).success).toBe(false);
    expect(otpRequestSchema.safeParse({ phone: '9876543210', channel: 'whatsapp' }).success).toBe(false);
    expect(otpRequestSchema.safeParse({ phone: '++919876543210', channel: 'whatsapp' }).success).toBe(false);
  });

  it('requires a six digit OTP', () => {
    expect(otpVerifySchema.safeParse({ requestId: '665f6d8403bd2edc93800000', otp: '123456' }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ requestId: '665f6d8403bd2edc93800000', otp: '12ab56' }).success).toBe(false);
  });

  it('enforces the server password policy', () => {
    expect(registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'Password1' }).success).toBe(true);
    expect(registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'password' }).success).toBe(false);
  });
});
