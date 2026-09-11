// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import type { WorkflowRequest } from '@/hooks/useLogistics';
import { exchangeOrderLine, groupExchangeRequestsByOrder } from './exchange-orders';

const request = (id: string, orderId: string, orderNumber: string, variant: string): WorkflowRequest => ({
  _id: id,
  requestNumber: `EXC-${id}`,
  status: 'requested',
  createdAt: '2026-09-09T00:00:00.000Z',
  originalItem: { variant, sku: `OLD-${variant}`, quantity: 1 },
  order: { _id: orderId, orderNumber, items: [{ variant, title: `Product ${variant}`, sku: `OLD-${variant}`, quantity: 1, image: `https://example.test/${variant}.jpg` }] }
});

describe('exchange order grouping', () => {
  it('shows one review entry per order while retaining every product request', () => {
    const groups = groupExchangeRequestsByOrder([
      request('1', 'order-a', 'CR-100', 'variant-a'),
      request('2', 'order-a', 'CR-100', 'variant-b'),
      request('3', 'order-b', 'CR-200', 'variant-c')
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ orderId: 'order-a', orderNumber: 'CR-100' });
    expect(groups[0].requests).toHaveLength(2);
  });

  it('finds the purchased product snapshot used for image review', () => {
    const exchange = request('1', 'order-a', 'CR-100', 'variant-a');
    expect(exchangeOrderLine(exchange)).toMatchObject({ title: 'Product variant-a', image: 'https://example.test/variant-a.jpg' });
  });
});
