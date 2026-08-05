import { describe, expect, it } from 'vitest';
import { checkoutSchema, customerCancellationSchema, orderStatusSchema } from './order.validator.js';

const checkout = {
  shippingAddress: { fullName: 'Test Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
  billingAddress: { fullName: 'Test Customer', phone: '+919876543210', line1: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
  paymentMethod: 'razorpay',
  paymentMode: 'online',
  shippingMethod: 'standard',
  idempotencyKey: '11111111-1111-4111-8111-111111111111'
};

describe('checkoutSchema Meta event ID', () => {
  it('accepts a non-sensitive checkout event ID for future CAPI deduplication', () => {
    const result = checkoutSchema.parse({ ...checkout, metaEventId: 'checkout:11111111-1111-4111-8111-111111111111' });
    expect(result.metaEventId).toBe('checkout:11111111-1111-4111-8111-111111111111');
  });

  it('rejects malformed or oversized event IDs', () => {
    expect(checkoutSchema.safeParse({ ...checkout, metaEventId: 'customer@example.com' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...checkout, metaEventId: `checkout:${'x'.repeat(200)}` }).success).toBe(false);
  });
});

describe('customerCancellationSchema', () => {
  it('accepts a common cancellation reason without free text', () => {
    expect(customerCancellationSchema.safeParse({ reasonCode: 'wrong_item' }).success).toBe(true);
  });

  it('requires a meaningful explanation for Other', () => {
    expect(customerCancellationSchema.safeParse({ reasonCode: 'other' }).success).toBe(false);
    expect(customerCancellationSchema.safeParse({ reasonCode: 'other', details: 'Too short' }).success).toBe(false);
    expect(customerCancellationSchema.safeParse({ reasonCode: 'other', details: 'I need a different delivery arrangement.' }).success).toBe(true);
  });

  it('rejects unknown reasons and oversized explanations', () => {
    expect(customerCancellationSchema.safeParse({ reasonCode: 'not_listed' }).success).toBe(false);
    expect(customerCancellationSchema.safeParse({ reasonCode: 'changed_mind', details: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('orderStatusSchema', () => {
  it('requires an auditable note when an administrator cancels an order', () => {
    expect(orderStatusSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
    expect(orderStatusSchema.safeParse({ status: 'cancelled', note: 'Customer requested cancellation by phone.' }).success).toBe(true);
    expect(orderStatusSchema.safeParse({ status: 'processing' }).success).toBe(true);
  });
});
