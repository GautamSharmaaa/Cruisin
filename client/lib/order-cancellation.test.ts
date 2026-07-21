import { describe, expect, it } from 'vitest';
import { cancellationDetailsAreValid, canCustomerCancel, humanizeOrderStatus } from './order-cancellation';

describe('order cancellation helpers', () => {
  it('allows customer cancellation only before shipment', () => {
    expect(canCustomerCancel({ orderStatus: 'confirmed' })).toBe(true);
    expect(canCustomerCancel({ orderStatus: 'processing' })).toBe(true);
    expect(canCustomerCancel({ orderStatus: 'shipped' })).toBe(false);
    expect(canCustomerCancel({ orderStatus: 'cancelled' })).toBe(false);
  });

  it('requires at least ten characters when Other is selected', () => {
    expect(cancellationDetailsAreValid('changed_mind', '')).toBe(true);
    expect(cancellationDetailsAreValid('other', 'Too short')).toBe(false);
    expect(cancellationDetailsAreValid('other', 'Plans have changed.')).toBe(true);
  });

  it('turns machine statuses into customer-facing labels', () => {
    expect(humanizeOrderStatus('partially_refunded')).toBe('Partially Refunded');
  });
});
