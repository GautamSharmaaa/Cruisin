import { describe, expect, it } from 'vitest';
import { customerCancellationSchema, orderStatusSchema } from './order.validator.js';

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
