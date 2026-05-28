// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { PRODUCTS } from '@/constants/catalog';
import { api } from '@/lib/api';
import type { ApiEnvelope, PaginatedResult } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: async (): Promise<Product[]> => { try { const response = await api.get<ApiEnvelope<PaginatedResult<Product>>>('/products'); return response.data.data.items; } catch { return PRODUCTS; } } });
