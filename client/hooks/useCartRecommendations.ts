// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapProduct, type ApiProduct } from '@/lib/product-mapper';
import type { ApiEnvelope } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export interface CartRecommendations {
  source: 'manual' | 'frequently_bought_together' | 'best_sellers';
  anchorProductId?: string;
  eligibleProductIds: string[];
  currentBundleDiscount: number;
  bundleEligibleProductCount: number;
  title: string;
  eyebrow: string;
  description: string;
  bundleDiscount: { enabled: boolean; twoItemDiscount: number; threeItemDiscount: number };
  items: Product[];
}

interface ApiCartRecommendations extends Omit<CartRecommendations, 'items'> { items: ApiProduct[]; }

export const useCartRecommendations = (productIds: string[], enabled = true) => useQuery({
  queryKey: ['cart-recommendations', productIds],
  queryFn: async (): Promise<CartRecommendations> => {
    const response = await api.get<ApiEnvelope<ApiCartRecommendations>>('/products/cart-recommendations', { params: { productIds: productIds.join(','), limit: 8 } });
    return { ...response.data.data, items: response.data.data.items.map(mapProduct) };
  },
  enabled: enabled && productIds.length > 0,
  staleTime: 30_000
});
