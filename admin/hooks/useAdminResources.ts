// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminAnalyticsPointDto, AdminAnalyticsSummaryDto, AdminOverviewDto, CategoryDto, CmsMediaDto, CmsPageDto, CmsSectionDto, CmsVersionDto, CollectionDto, CouponDto, NavigationItemDto, OrderDto, PageSettingsDto, ProductDto, SiteSettingsDto, TagDto, UserDto } from '@/types/dto.types';

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

export interface AdminProductFilters {
  q?: string;
  category?: string;
  status?: 'all' | 'visible' | 'hidden' | 'draft' | 'archived';
  stock?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  featured?: 'all' | 'yes' | 'no';
  bestseller?: 'all' | 'yes' | 'no';
  newArrival?: 'all' | 'yes' | 'no';
  needsFix?: 'all' | 'yes';
  createdFrom?: string;
  updatedFrom?: string;
  pickupAddress?: string;
  sort?: 'updated' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'sales-desc' | 'title-asc';
  page?: number;
  limit?: number;
}

export const useAdminOverview = () => useQuery({ queryKey: ['admin', 'overview'], queryFn: async (): Promise<AdminOverviewDto> => { const response = await api.get<ApiEnvelope<AdminOverviewDto>>('/admin/overview'); return response.data.data; } });
export const useAdminMe = (enabled = true) => useQuery({ queryKey: ['admin', 'me'], queryFn: async (): Promise<UserDto> => { const response = await api.get<ApiEnvelope<UserDto>>('/auth/me'); return response.data.data; }, enabled, retry: false });
export const useAdminAnalytics = (days: number) => useQuery({ queryKey: ['admin', 'analytics', days], queryFn: async (): Promise<AdminAnalyticsPointDto[]> => { const response = await api.get<ApiEnvelope<AdminAnalyticsPointDto[]>>('/admin/analytics', { params: { days } }); return response.data.data; } });
export const useAdminAnalyticsSummary = (params: { preset?: string; startDate?: string; endDate?: string; analyticsTestBatchId?: string }) => useQuery({ queryKey: ['admin', 'analytics', 'summary', params], queryFn: async (): Promise<AdminAnalyticsSummaryDto> => { const response = await api.get<ApiEnvelope<AdminAnalyticsSummaryDto>>('/admin/analytics/summary', { params }); return response.data.data; }, staleTime: 60_000 });
export const useAdminProducts = (filters: AdminProductFilters = {}) => useQuery({ queryKey: ['admin', 'products', filters], queryFn: async (): Promise<PaginatedResult<ProductDto>> => { const response = await api.get<ApiEnvelope<PaginatedResult<ProductDto>>>('/products/admin/catalogue', { params: filters }); return response.data.data; } });
export const useAdminProduct = (id: string) => useQuery({ queryKey: ['admin', 'products', id], queryFn: async (): Promise<ProductDto> => { const response = await api.get<ApiEnvelope<ProductDto>>('/products/admin/' + id); return response.data.data; }, enabled: id.length > 0 });
export const useAdminOrders = () => useQuery({ queryKey: ['admin', 'orders'], queryFn: async (): Promise<OrderDto[]> => { const response = await api.get<ApiEnvelope<OrderDto[]>>('/admin/orders'); return response.data.data; } });
export const useAdminOrder = (id: string) => useQuery({ queryKey: ['admin', 'orders', id], queryFn: async (): Promise<OrderDto> => { const response = await api.get<ApiEnvelope<OrderDto>>('/admin/orders/' + id); return response.data.data; }, enabled: id.length > 0 });
export const useAdminCategories = () => useQuery({ queryKey: ['admin', 'categories'], queryFn: async (): Promise<CategoryDto[]> => { const response = await api.get<ApiEnvelope<CategoryDto[]>>('/admin/categories'); return response.data.data; } });
export const useAdminNavigation = () => useQuery({ queryKey: ['admin', 'navigation'], queryFn: async (): Promise<NavigationItemDto[]> => { const response = await api.get<ApiEnvelope<NavigationItemDto[]>>('/admin/navigation'); return response.data.data; } });
export const useAdminCollections = () => useQuery({ queryKey: ['admin', 'collections'], queryFn: async (): Promise<CollectionDto[]> => { const response = await api.get<ApiEnvelope<CollectionDto[]>>('/admin/collections'); return response.data.data; } });
export const useAdminTags = () => useQuery({ queryKey: ['admin', 'tags'], queryFn: async (): Promise<TagDto[]> => { const response = await api.get<ApiEnvelope<TagDto[]>>('/admin/tags'); return response.data.data; } });
export const useAdminPageSettings = () => useQuery({ queryKey: ['admin', 'page-settings'], queryFn: async (): Promise<PageSettingsDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<PageSettingsDto>>>('/admin/page-settings', { params: { limit: 100 } }); return response.data.data.items; } });
export const useAdminSiteSettings = () => useQuery({ queryKey: ['admin', 'site-settings'], queryFn: async (): Promise<SiteSettingsDto> => { const response = await api.get<ApiEnvelope<SiteSettingsDto>>('/admin/site-settings'); return response.data.data; } });
export const useAdminCoupons = () => useQuery({ queryKey: ['admin', 'coupons'], queryFn: async (): Promise<CouponDto[]> => { const response = await api.get<ApiEnvelope<CouponDto[]>>('/admin/coupons'); return response.data.data; } });
export const useAdminUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: async (): Promise<UserDto[]> => { const response = await api.get<ApiEnvelope<PaginatedResult<UserDto>>>('/admin/users', { params: { limit: 100 } }); return response.data.data.items; } });
export const useAdminBanners = () => useQuery({ queryKey: ['admin', 'banners'], queryFn: async (): Promise<CmsSectionDto[]> => { const response = await api.get<ApiEnvelope<CmsSectionDto[]>>('/cms/banners'); return response.data.data; } });
export const useCmsPages = () => useQuery({ queryKey: ['admin', 'cms', 'pages'], queryFn: async (): Promise<CmsPageDto[]> => { const response = await api.get<ApiEnvelope<CmsPageDto[]>>('/cms/pages'); return response.data.data; } });
export const useCmsPageSections = (pageId?: string) => useQuery({ queryKey: ['admin', 'cms', 'sections', pageId], queryFn: async (): Promise<CmsSectionDto[]> => { const response = await api.get<ApiEnvelope<CmsSectionDto[]>>('/cms/pages/' + pageId + '/sections'); return response.data.data; }, enabled: Boolean(pageId) });
export const useCmsVersions = (pageId?: string) => useQuery({ queryKey: ['admin', 'cms', 'versions', pageId], queryFn: async (): Promise<CmsVersionDto[]> => { const response = await api.get<ApiEnvelope<CmsVersionDto[]>>('/cms/pages/' + pageId + '/versions'); return response.data.data; }, enabled: Boolean(pageId) });
export const useCmsMedia = () => useQuery({ queryKey: ['admin', 'cms', 'media'], queryFn: async (): Promise<CmsMediaDto[]> => { const response = await api.get<ApiEnvelope<CmsMediaDto[]>>('/cms/media'); return response.data.data; } });
