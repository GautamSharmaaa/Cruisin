// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminOverviewDto, CategoryDto, CouponDto, OrderDto, ProductDto, UserDto } from '@/types/dto.types';

interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
  message: string;
  error?: string[];
}

interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pages: number;
}

export const useAdminOverview = () => useQuery({ queryKey: ['admin', 'overview'], queryFn: async (): Promise<AdminOverviewDto> => { const response = await api.get<ApiEnvelope<AdminOverviewDto>>('/admin/overview'); return response.data.data; } });
export const useAdminProducts = () => useQuery({ queryKey: ['admin', 'products'], queryFn: async (): Promise<ProductDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<ProductDto>>>('/products'); return response.data.data.items; } });
export const useAdminOrders = () => useQuery({ queryKey: ['admin', 'orders'], queryFn: async (): Promise<OrderDto[]> => { const response = await api.get<ApiEnvelope<OrderDto[]>>('/orders'); return response.data.data; } });
export const useAdminCategories = () => useQuery({ queryKey: ['admin', 'categories'], queryFn: async (): Promise<CategoryDto[]> => { const response = await api.get<ApiEnvelope<CategoryDto[]>>('/admin/categories'); return response.data.data; } });
export const useAdminCoupons = () => useQuery({ queryKey: ['admin', 'coupons'], queryFn: async (): Promise<CouponDto[]> => { const response = await api.get<ApiEnvelope<CouponDto[]>>('/admin/coupons'); return response.data.data; } });
export const useAdminUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: async (): Promise<UserDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<UserDto>>>('/admin/users'); return response.data.data.items; } });
