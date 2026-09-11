// Governed by .rules v1.0
export interface OrderPaymentState {
  paymentMethod?: string;
  paymentMode?: string;
  paymentStatus?: string;
  orderStatus?: string;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
}

export interface CodCollectionSummary {
  collectedOrders: number;
  collectedAmount: number;
  pendingOrders: number;
  pendingAmount: number;
}

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
export const isCodOrder = (order: OrderPaymentState): boolean => order.paymentMode === 'cod' || order.paymentMethod === 'cod';

export const effectiveOrderPaymentStatus = (order: OrderPaymentState): string => {
  const status = order.paymentStatus ?? 'pending';
  if (!isCodOrder(order)) return status;
  if (status === 'cod_collected' || status === 'paid') return 'cod_collected';
  if (status === 'cod_pending' && ['delivered', 'returned'].includes(order.orderStatus ?? '')) return 'cod_collected';
  return status;
};

export const normalizeOrderPaymentRead = <TValue extends OrderPaymentState>(order: TValue): TValue => {
  const paymentStatus = effectiveOrderPaymentStatus(order);
  const cancelled = order.orderStatus === 'cancelled';
  const codCollected = paymentStatus === 'cod_collected';
  const amountPaid = codCollected ? order.total ?? order.amountPaid ?? 0 : order.amountPaid;
  const amountDue = cancelled || codCollected ? 0 : order.amountDue;
  if (paymentStatus === order.paymentStatus && amountPaid === order.amountPaid && amountDue === order.amountDue) return order;
  return { ...order, paymentStatus, amountPaid, amountDue } as TValue;
};

export const codCollectionSummary = (orders: readonly OrderPaymentState[]): CodCollectionSummary => {
  let collectedOrders = 0;
  let collectedAmount = 0;
  let pendingOrders = 0;
  let pendingAmount = 0;
  for (const order of orders) {
    if (!isCodOrder(order) || order.orderStatus === 'cancelled') continue;
    const status = effectiveOrderPaymentStatus(order);
    if (status === 'cod_collected') {
      collectedOrders += 1;
      collectedAmount += order.total ?? order.amountPaid ?? 0;
    } else if (status === 'cod_pending') {
      pendingOrders += 1;
      pendingAmount += order.amountDue ?? order.total ?? 0;
    }
  }
  return { collectedOrders, collectedAmount: money(collectedAmount), pendingOrders, pendingAmount: money(pendingAmount) };
};
