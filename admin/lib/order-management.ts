import type { OrderDto } from '@/types/dto.types';

export type OrderStatus = 'pending' | 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

// Delivery is confirmed by Shiprocket, not an admin dropdown.
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'], placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
  shipped: [], delivered: ['returned'], cancelled: [], returned: [],
};

export function isCollectedOrder(order: Pick<OrderDto, 'paymentStatus' | 'orderStatus'>): boolean {
  return order.orderStatus !== 'cancelled' && ['paid', 'cod_collected'].includes(order.paymentStatus);
}
