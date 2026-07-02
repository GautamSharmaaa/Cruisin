// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CategoryDto } from '@/types/dto.types';

const normalizePath = (path: string): string => path.toLowerCase().replace(/^\/+|\/+$/g, '');

const findCategoryByPath = (categories: CategoryDto[] | undefined, path: string): CategoryDto | null => {
  const normalizedPath = normalizePath(path);
  const lastSlug = normalizedPath.split('/').filter(Boolean).at(-1) ?? normalizedPath;
  return categories?.find((category) => normalizePath(category.path ?? category.slug) === normalizedPath || category.slug === lastSlug) ?? null;
};

export const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: async (): Promise<CategoryDto[]> => {
    const response = await api.get<ApiEnvelope<CategoryDto[]>>('/categories');
    return response.data.data;
  }
});

export const useCategoryByPath = (path?: string) => {
  const categories = useCategories();
  return { ...categories, data: path ? findCategoryByPath(categories.data, path) : null };
};
