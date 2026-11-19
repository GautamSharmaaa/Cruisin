// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapProduct, type ApiProduct } from '@/lib/product-mapper';
import type { ApiEnvelope } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export const useProduct = (slug: string, initialProduct?: Product) => useQuery({
  queryKey: ['product', slug],
  initialData: initialProduct,
  queryFn: async ({ signal }): Promise<Product> => {
    const response = await api.get<ApiEnvelope<ApiProduct>>('/products/' + slug, { signal });
    return mapProduct(response.data.data);
  }
});
