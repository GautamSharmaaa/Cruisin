// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminAnalyticsPointDto, AdminOverviewDto, CategoryDto, CmsMediaDto, CmsPageDto, CmsSectionDto, CmsVersionDto, CouponDto, OrderDto, ProductDto, UserDto } from '@/types/dto.types';

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
export const useAdminMe = () => useQuery({ queryKey: ['admin', 'me'], queryFn: async (): Promise<UserDto> => { const response = await api.get<ApiEnvelope<UserDto>>('/auth/me'); return response.data.data; }, retry: false });
export const useAdminAnalytics = (days: number) => useQuery({ queryKey: ['admin', 'analytics', days], queryFn: async (): Promise<AdminAnalyticsPointDto[]> => { const response = await api.get<ApiEnvelope<AdminAnalyticsPointDto[]>>('/admin/analytics', { params: { days } }); return response.data.data; } });
export const useAdminProducts = () => useQuery({ queryKey: ['admin', 'products'], queryFn: async (): Promise<ProductDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<ProductDto>>>('/products'); return response.data.data.items; } });
export const useAdminProduct = (id: string) => useQuery({ queryKey: ['admin', 'products', id], queryFn: async (): Promise<ProductDto> => { const response = await api.get<ApiEnvelope<ProductDto>>('/products/admin/' + id); return response.data.data; }, enabled: id.length > 0 });
export const useAdminOrders = () => useQuery({ queryKey: ['admin', 'orders'], queryFn: async (): Promise<OrderDto[]> => { const response = await api.get<ApiEnvelope<OrderDto[]>>('/orders'); return response.data.data; } });
export const useAdminOrder = (id: string) => useQuery({ queryKey: ['admin', 'orders', id], queryFn: async (): Promise<OrderDto> => { const response = await api.get<ApiEnvelope<OrderDto>>('/orders/' + id); return response.data.data; }, enabled: id.length > 0 });
export const useAdminCategories = () => useQuery({ queryKey: ['admin', 'categories'], queryFn: async (): Promise<CategoryDto[]> => { const response = await api.get<ApiEnvelope<CategoryDto[]>>('/admin/categories'); return response.data.data; } });
export const useAdminCoupons = () => useQuery({ queryKey: ['admin', 'coupons'], queryFn: async (): Promise<CouponDto[]> => { const response = await api.get<ApiEnvelope<CouponDto[]>>('/admin/coupons'); return response.data.data; } });
export const useAdminUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: async (): Promise<UserDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<UserDto>>>('/admin/users'); return response.data.data.items; } });
export const useAdminBanners = () => useQuery({ queryKey: ['admin', 'banners'], queryFn: async (): Promise<CmsSectionDto[]> => { const response = await api.get<ApiEnvelope<CmsSectionDto[]>>('/cms/banners'); return response.data.data; } });
export const useCmsPages = () => useQuery({ queryKey: ['admin', 'cms', 'pages'], queryFn: async (): Promise<CmsPageDto[]> => { const response = await api.get<ApiEnvelope<CmsPageDto[]>>('/cms/pages'); return response.data.data; } });
export const useCmsPageSections = (pageId?: string) => useQuery({ queryKey: ['admin', 'cms', 'sections', pageId], queryFn: async (): Promise<CmsSectionDto[]> => { const response = await api.get<ApiEnvelope<CmsSectionDto[]>>('/cms/pages/' + pageId + '/sections'); return response.data.data; }, enabled: Boolean(pageId) });
export const useCmsVersions = (pageId?: string) => useQuery({ queryKey: ['admin', 'cms', 'versions', pageId], queryFn: async (): Promise<CmsVersionDto[]> => { const response = await api.get<ApiEnvelope<CmsVersionDto[]>>('/cms/pages/' + pageId + '/versions'); return response.data.data; }, enabled: Boolean(pageId) });
export const useCmsMedia = () => useQuery({ queryKey: ['admin', 'cms', 'media'], queryFn: async (): Promise<CmsMediaDto[]> => { const response = await api.get<ApiEnvelope<CmsMediaDto[]>>('/cms/media'); return response.data.data; } });
