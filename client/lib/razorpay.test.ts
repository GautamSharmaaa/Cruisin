import { describe, expect, it } from 'vitest';
import { razorpayPrefillContact } from '@/lib/razorpay';

describe('razorpayPrefillContact', () => {
  it('normalizes valid Indian mobile numbers', () => {
    expect(razorpayPrefillContact('+91 98765-43210', 'test')).toBe('9876543210');
  });

  it('uses the safe fallback only in test mode', () => {
    expect(razorpayPrefillContact('12345', 'test')).toBe('9988776655');
    expect(razorpayPrefillContact('12345', 'live')).toBeUndefined();
  });
});
