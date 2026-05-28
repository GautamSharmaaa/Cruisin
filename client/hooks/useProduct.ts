// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { PRODUCTS } from '@/constants/catalog';
import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { Product } from '@/types/product.types';

export const useProduct = (slug: string) => useQuery({ queryKey: ['product', slug], queryFn: async (): Promise<Product> => { try { const response = await api.get<ApiEnvelope<Product>>('/products/' + slug); return response.data.data; } catch { const product = PRODUCTS.find((item) => item.slug === slug); if (!product) throw new Error('Product not found'); return product; } } });
