// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ProductGrid } from '@/components/shop/product-grid';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { COPY } from '@/constants/copy';
import { useProducts } from '@/hooks/useProducts';

export interface NewArrivalsProps { }
export function NewArrivals(_props: NewArrivalsProps): ReactNode { const products = useProducts({ sort: 'newest', limit: 8 }); return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl text-text-primary">{COPY.home.newArrivals}</h2>{products.isLoading ? <div className="grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div> : <ProductGrid products={products.data?.items ?? []} />}</section>; }
