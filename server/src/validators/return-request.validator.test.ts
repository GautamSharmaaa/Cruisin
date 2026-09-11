// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { refundDestinationSchema, returnPaymentVerifySchema, returnRequestSchema } from './logistics.validator.js';

const valid = {
  orderId: '000000000000000000000001',
  items: [
    { variantId: '000000000000000000000002', quantity: 1 },
    { variantId: '000000000000000000000003', quantity: 2 }
  ],
  reason: 'wrong_size_fit',
  details: 'The selected sizes do not fit as expected.',
  evidence: [{ publicId: 'cruisin/returns/customer/photo', version: 1, format: 'jpg', token: 'a'.repeat(64) }],
  idempotencyKey: '11111111-1111-4111-8111-111111111111'
};

describe('return request validation', () => {
  it('accepts a multi-item request without accepting a client fee', () => {
    expect(returnRequestSchema.parse(valid).items).toHaveLength(2);
    expect(returnRequestSchema.safeParse({ ...valid, handlingFee: 1 }).success).toBe(false);
  });

  it('requires valid items, a structured issue, and at least one photo while keeping details optional', () => {
    expect(returnRequestSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(returnRequestSchema.safeParse({ ...valid, reason: 'anything' }).success).toBe(false);
    expect(returnRequestSchema.safeParse({ ...valid, details: '' }).success).toBe(true);
    expect(returnRequestSchema.safeParse({ ...valid, evidence: [] }).success).toBe(false);
    expect(returnRequestSchema.safeParse({ ...valid, evidence: Array.from({ length: 6 }, () => valid.evidence[0]) }).success).toBe(false);
  });

  it('requires a request id and opaque provider payload for verification', () => {
    expect(returnPaymentVerifySchema.safeParse({ requestId: valid.orderId, payload: { razorpay_order_id: 'order_mock' } }).success).toBe(true);
    expect(returnPaymentVerifySchema.safeParse({ requestId: valid.orderId, payload: {}, paid: true }).success).toBe(false);
  });

  it('accepts wallet and valid UPI/bank destinations but rejects phone-only or mismatched details', () => {
    expect(refundDestinationSchema.safeParse({ method: 'wallet' }).success).toBe(true);
    expect(refundDestinationSchema.safeParse({ method: 'upi', upiId: '9876543210@upi' }).success).toBe(true);
    expect(refundDestinationSchema.safeParse({ method: 'upi', upiId: '9876543210' }).success).toBe(false);
    expect(refundDestinationSchema.safeParse({ method: 'bank', accountHolderName: 'Return Customer', accountNumber: '123456789012', confirmAccountNumber: '123456789012', ifsc: 'HDFC0000053' }).success).toBe(true);
    expect(refundDestinationSchema.safeParse({ method: 'bank', accountHolderName: 'Return Customer', accountNumber: '123456789012', confirmAccountNumber: '123456789013', ifsc: 'HDFC0000053' }).success).toBe(false);
  });
});
