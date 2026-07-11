// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { Order } from '@/types/order.types';

export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: async (): Promise<Order[]> => { const response = await api.get<ApiEnvelope<Order[]>>('/orders/mine'); return response.data.data; } });
export const useOrder = (id: string | undefined) => useQuery({ queryKey: ['orders', id], enabled: Boolean(id), queryFn: async (): Promise<Order> => { const response = await api.get<ApiEnvelope<Order>>('/orders/' + id); return response.data.data; } });
