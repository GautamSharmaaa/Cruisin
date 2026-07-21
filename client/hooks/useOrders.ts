// Governed by .rules v1.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from '@/lib/payment-status';
import type { ApiEnvelope } from '@/types/api.types';
import type { CancellationReasonCode, Order } from '@/types/order.types';

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

export interface CancelOrderInput {
  reasonCode: CancellationReasonCode;
  details?: string;
}

export const useCancelOrder = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CancelOrderInput): Promise<Order> => {
      const response = await api.post<ApiEnvelope<Order>>(`/orders/${id}/cancel`, input);
      return response.data.data;
    },
    onSuccess: async (cancelledOrder): Promise<void> => {
      queryClient.setQueryData(['orders', id], cancelledOrder);
      queryClient.setQueryData<Order[]>(['orders'], (orders) => orders?.map((order) => (order.id ?? order._id) === id ? cancelledOrder : order));
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};
