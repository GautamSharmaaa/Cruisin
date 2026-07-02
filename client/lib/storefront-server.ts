// Governed by .rules v1.0
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/constants/config';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CategoryDto, CollectionDto, PageSettingsDto } from '@/types/dto.types';

export const loadPageSettingsServer = async (pageType: string, pageSlug = 'index'): Promise<PageSettingsDto | null> => {
  try {
    const response = await serverApi.get<ApiEnvelope<PageSettingsDto>>('/page-settings/' + encodeURIComponent(pageType) + '/' + encodeURIComponent(pageSlug));
    return response.data.data;
  } catch {
    return null;
  }
};

export const loadCollectionServer = async (slug: string): Promise<CollectionDto | null> => {
  try {
    const response = await serverApi.get<ApiEnvelope<CollectionDto>>('/collections/' + slug);
    return response.data.data;
  } catch {
    return null;
  }
};

export const loadCategoryServer = async (path: string): Promise<CategoryDto | null> => {
  try {
    const response = await serverApi.get<ApiEnvelope<CategoryDto[]>>('/categories');
    const normalizedPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
    const lastSlug = normalizedPath.split('/').filter(Boolean).at(-1) ?? normalizedPath;
    return response.data.data.find((category) => {
      const categoryPath = (category.path ?? category.slug).toLowerCase().replace(/^\/+|\/+$/g, '');
      return categoryPath === normalizedPath || category.slug === lastSlug;
    }) ?? null;
  } catch {
    return null;
  }
};

export const metadataFromSettings = (settings: PageSettingsDto | CategoryDto | CollectionDto | null, fallbackTitle: string, fallbackDescription: string = BRAND_CONFIG.tagline): Metadata => {
  const title = 'seoTitle' in (settings ?? {}) ? settings?.seoTitle : undefined;
  const description = 'seoDescription' in (settings ?? {}) ? settings?.seoDescription : undefined;
  const ogImage = 'ogImage' in (settings ?? {}) ? settings?.ogImage : undefined;
  return {
    title: title || fallbackTitle,
    description: description || fallbackDescription,
    openGraph: { images: ogImage ? [ogImage] : [] }
  };
};
