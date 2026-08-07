import type { CancellationReasonCode, Order } from '@/types/order.types';

export const CUSTOMER_CANCELLATION_REASONS: ReadonlyArray<{ code: CancellationReasonCode; label: string; description: string }> = [
  { code: 'changed_mind', label: 'Changed my mind', description: 'I no longer want to place this order.' },
  { code: 'wrong_item', label: 'Wrong size or item', description: 'I selected the wrong product, size, or colour.' },
  { code: 'delivery_too_slow', label: 'Delivery timing', description: 'The expected delivery timing no longer works.' },
  { code: 'found_better_option', label: 'Found another option', description: 'I found a product that suits me better.' },
  { code: 'other', label: 'Other reason', description: 'Tell us what went wrong so we can improve.' }
];

const cancellableStatuses = new Set(['pending', 'placed', 'confirmed', 'processing']);

export const orderId = (order: Pick<Order, 'id' | '_id'>): string => order.id ?? order._id ?? '';
export const orderStatus = (order: Pick<Order, 'orderStatus' | 'status'>): string => order.orderStatus ?? order.status ?? 'pending';
export const customerFacingOrderStatus = (order: Pick<Order, 'paymentStatus' | 'orderStatus' | 'status' | 'cancellation'>): string => {
  if (order.paymentStatus === 'failed') return 'payment_failed';
  if (order.paymentStatus === 'cancelled' && order.cancellation?.reasonCode === 'payment_cancelled') return 'payment_cancelled';
  return orderStatus(order);
};
export const canCustomerCancel = (order: Pick<Order, 'orderStatus' | 'status'>): boolean => cancellableStatuses.has(orderStatus(order));
export const cancellationDetailsAreValid = (reasonCode: CancellationReasonCode | '', details: string): boolean => Boolean(reasonCode) && (reasonCode !== 'other' || details.trim().length >= 10);
export const humanizeOrderStatus = (status: string | undefined): string => (status ?? 'pending').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
