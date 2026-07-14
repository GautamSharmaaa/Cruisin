// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapProduct, type ApiProduct } from '@/lib/product-mapper';
import type { ApiEnvelope, PaginatedResult } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export interface UseProductsInput {
  enabled?: boolean;
  category?: string;
  subcategory?: string;
  collection?: string;
  tags?: string;
  gender?: 'men' | 'women' | 'unisex';
  sale?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  latestDrop?: boolean;
  q?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  priceMin?: number;
  priceMax?: number;
  availability?: 'all' | 'in-stock' | 'out-of-stock';
  sort?: string;
  page?: number;
  limit?: number;
}

export const useProducts = (input: UseProductsInput = {}) => {
  const { enabled = true, ...params } = input;
  return useQuery({
  queryKey: ['products', params],
  queryFn: async (): Promise<PaginatedResult<Product>> => {
    const response = await api.get<ApiEnvelope<PaginatedResult<ApiProduct>>>('/products', { params });
    return { ...response.data.data, items: response.data.data.items.map(mapProduct) };
  },
  enabled
});
};
