import { describe, expect, it } from 'vitest';
import { isCollectedOrder, orderTransitions } from './order-management';

describe('order management payment and delivery state', () => {
  it('counts collected COD alongside prepaid payments', () => {
    expect(isCollectedOrder({ paymentStatus: 'paid', orderStatus: 'delivered' })).toBe(true);
    expect(isCollectedOrder({ paymentStatus: 'cod_collected', orderStatus: 'delivered' })).toBe(true);
  });
  it('does not count pending COD or cancelled orders as collected', () => {
    expect(isCollectedOrder({ paymentStatus: 'cod_pending', orderStatus: 'shipped' })).toBe(false);
    expect(isCollectedOrder({ paymentStatus: 'cod_collected', orderStatus: 'cancelled' })).toBe(false);
    expect(isCollectedOrder({ paymentStatus: 'paid', orderStatus: 'cancelled' })).toBe(false);
  });
  it('does not offer manual delivery confirmation for shipped orders', () => {
    expect(orderTransitions.shipped).toEqual([]);
  });
});
