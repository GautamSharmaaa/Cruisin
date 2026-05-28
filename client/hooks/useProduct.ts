// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapProduct, type ApiProduct } from '@/lib/product-mapper';
import type { ApiEnvelope } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export const useProduct = (slug: string) => useQuery({
  queryKey: ['product', slug],
  queryFn: async (): Promise<Product> => {
    const response = await api.get<ApiEnvelope<ApiProduct>>('/products/' + slug);
    return mapProduct(response.data.data);
  }
});
