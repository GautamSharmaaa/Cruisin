// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { codCollectionSummary, effectiveOrderPaymentStatus, normalizeOrderPaymentRead } from './order-payment-status.js';

describe('COD payment status', () => {
  it('keeps undelivered COD due and promotes delivered legacy COD to collected', () => {
    expect(effectiveOrderPaymentStatus({ paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'shipped' })).toBe('cod_pending');
    expect(effectiveOrderPaymentStatus({ paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'delivered' })).toBe('cod_collected');
    expect(effectiveOrderPaymentStatus({ paymentMethod: 'cod', paymentStatus: 'paid', orderStatus: 'processing' })).toBe('cod_collected');
  });

  it('normalizes collected COD money without changing the stored object', () => {
    const stored = { paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'delivered', total: 2_499, amountPaid: 0, amountDue: 2_499 };
    const view = normalizeOrderPaymentRead(stored);
    expect(view).toMatchObject({ paymentStatus: 'cod_collected', amountPaid: 2_499, amountDue: 0 });
    expect(stored).toMatchObject({ paymentStatus: 'cod_pending', amountPaid: 0, amountDue: 2_499 });
  });

  it('reports collected and pending COD separately', () => {
    expect(codCollectionSummary([
      { paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'shipped', total: 1_000, amountDue: 1_000 },
      { paymentMode: 'cod', paymentStatus: 'cod_pending', orderStatus: 'delivered', total: 2_000, amountDue: 2_000 },
      { paymentMode: 'online', paymentStatus: 'paid', orderStatus: 'delivered', total: 9_000 },
      { paymentMode: 'cod', paymentStatus: 'cancelled', orderStatus: 'cancelled', total: 4_000 }
    ])).toEqual({ collectedOrders: 1, collectedAmount: 2_000, pendingOrders: 1, pendingAmount: 1_000 });
  });
});
