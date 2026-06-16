import { beforeEach, describe, expect, it } from 'vitest';
import { getAccessToken, setAccessToken } from './access-token';
import { e164PhoneSchema, registerSchema } from './schemas';

describe('client auth utilities', () => {
  beforeEach(() => setAccessToken(null));

  it('stores access tokens in memory', () => {
    setAccessToken('short-lived-token');
    expect(getAccessToken()).toBe('short-lived-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('matches server phone and password validation', () => {
    expect(e164PhoneSchema.safeParse('+14155552671').success).toBe(true);
    expect(e164PhoneSchema.safeParse('4155552671').success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1' }).success).toBe(true);
  });
});
