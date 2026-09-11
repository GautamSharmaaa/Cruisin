// Governed by .rules v1.0
import type { Order } from '@/types/order.types';

const confirmedStatuses = ['paid', 'partially_paid', 'refunded', 'partially_refunded'];
const failedStatuses = ['failed', 'cancelled'];

export const isOrderPaymentConfirmed = (order: Pick<Order, 'paymentMode' | 'paymentStatus'>): boolean => {
  if (order.paymentMode === 'cod') return ['cod_pending', 'cod_collected'].includes(order.paymentStatus) || confirmedStatuses.includes(order.paymentStatus);
  return confirmedStatuses.includes(order.paymentStatus);
};

export const isOrderPaymentFailed = (order: Pick<Order, 'paymentStatus'>): boolean => failedStatuses.includes(order.paymentStatus);
