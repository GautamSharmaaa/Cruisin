// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ProductGrid } from '@/components/shop/product-grid';
import { COPY } from '@/constants/copy';
import { useProducts } from '@/hooks/useProducts';

export interface RecommendedProductsProps { excludeSlug: string; }
export function RecommendedProducts({ excludeSlug }: RecommendedProductsProps): ReactNode { const products = useProducts({ limit: 4 }); const items = (products.data?.items ?? []).filter((product) => product.slug !== excludeSlug).slice(0, 3); return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl">{COPY.product.recommended}</h2><ProductGrid products={items} /></section>; }
