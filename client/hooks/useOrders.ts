// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from '@/lib/payment-status';
import type { ApiEnvelope } from '@/types/api.types';
import type { Order } from '@/types/order.types';

export interface UseOrderOptions {
  pollPaymentStatus?: boolean;
}

export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: async (): Promise<Order[]> => { const response = await api.get<ApiEnvelope<Order[]>>('/orders/mine'); return response.data.data; } });
export const useOrder = (id: string | undefined, options: UseOrderOptions = {}) => useQuery({
  queryKey: ['orders', id],
  enabled: Boolean(id),
  queryFn: async (): Promise<Order> => {
    const response = await api.get<ApiEnvelope<Order>>('/orders/' + id);
    return response.data.data;
  },
  refetchInterval: (query) => {
    const order = query.state.data;
    if (!options.pollPaymentStatus || (order && (isOrderPaymentConfirmed(order) || isOrderPaymentFailed(order)))) return false;
    return 3_000;
  }
});
