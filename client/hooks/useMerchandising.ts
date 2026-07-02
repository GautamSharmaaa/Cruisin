// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope, PaginatedResult } from '@/types/api.types';
import type { CollectionDto, NavigationItemDto, PageSettingsDto, SiteSettingsDto, TagDto } from '@/types/dto.types';

export const useNavigation = () => useQuery({
  queryKey: ['navigation'],
  queryFn: async (): Promise<NavigationItemDto[]> => {
    const response = await api.get<ApiEnvelope<NavigationItemDto[]>>('/navigation');
    return response.data.data;
  },
  staleTime: 1000 * 60 * 5
});

export const useCollections = () => useQuery({
  queryKey: ['collections'],
  queryFn: async (): Promise<CollectionDto[]> => {
    const response = await api.get<ApiEnvelope<CollectionDto[]>>('/collections');
    return response.data.data;
  }
});

export const useCollection = (slug?: string) => useQuery({
  queryKey: ['collections', slug],
  queryFn: async (): Promise<CollectionDto> => {
    const response = await api.get<ApiEnvelope<CollectionDto>>('/collections/' + slug);
    return response.data.data;
  },
  enabled: Boolean(slug)
});

export const usePageSettings = (pageType: string, pageSlug = 'index') => useQuery({
  queryKey: ['page-settings', pageType, pageSlug],
  queryFn: async (): Promise<PageSettingsDto | null> => {
    try {
      const response = await api.get<ApiEnvelope<PageSettingsDto>>('/page-settings/' + encodeURIComponent(pageType) + '/' + encodeURIComponent(pageSlug));
      return response.data.data;
    } catch {
      return null;
    }
  }
});

export const useSiteSettings = () => useQuery({
  queryKey: ['site-settings'],
  queryFn: async (): Promise<SiteSettingsDto> => {
    const response = await api.get<ApiEnvelope<SiteSettingsDto>>('/site-settings');
    return response.data.data;
  }
});

export const useTags = () => useQuery({
  queryKey: ['tags'],
  queryFn: async (): Promise<TagDto[]> => {
    const response = await api.get<ApiEnvelope<TagDto[]>>('/tags');
    return response.data.data;
  }
});

export const loadPageSettings = async (pageType: string, pageSlug = 'index'): Promise<PageSettingsDto | null> => {
  try {
    const response = await api.get<ApiEnvelope<PageSettingsDto>>('/page-settings/' + encodeURIComponent(pageType) + '/' + encodeURIComponent(pageSlug));
    return response.data.data;
  } catch {
    return null;
  }
};

export type PageSettingsResult = PaginatedResult<PageSettingsDto>;
