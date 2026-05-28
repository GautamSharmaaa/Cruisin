// Governed by .rules v1.0
'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { ProductGrid } from '@/components/shop/product-grid';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { FilterDrawer } from '@/components/shop/filter-drawer';
import { SortSelect } from '@/components/shop/sort-select';
import { COPY } from '@/constants/copy';
import { useProducts } from '@/hooks/useProducts';

export interface InfiniteProductListProps { initialCategory?: string; }
export function InfiniteProductList({ initialCategory }: InfiniteProductListProps): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(24);
  const sort = params.get('sort') ?? 'newest';
  const category = initialCategory ?? params.get('category') ?? undefined;
  const size = params.get('size') ?? undefined;
  const color = params.get('color') ?? undefined;
  const activeFilters = [category, size, color].filter((value): value is string => Boolean(value));
  const products = useProducts({ category, size, color, sort, limit });
  const items = products.data?.items ?? [];
  const total = products.data?.total ?? items.length;
  const updateSort = (value: string): void => {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    router.push('/shop?' + next.toString());
  };
  return <div className="flex"><FilterSidebar activeCount={activeFilters.length} /><main className="min-w-0 flex-1 px-6 py-24 lg:px-12"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-4xl text-text-primary">{COPY.shop.title}</h1><p className="mt-2 text-sm text-text-secondary">{COPY.shop.showing} {items.length} of {total} {COPY.shop.items}</p></div><div className="flex gap-3"><Button variant="secondary" className="lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal size={16} /> {COPY.shop.filters}</Button><SortSelect value={sort} onChange={updateSort} /></div></div>{products.isLoading ? <div className="grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div> : items.length > 0 ? <ProductGrid products={items} /> : <EmptyState title={COPY.shop.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.shop.emptyCta} href="/shop" />}<div className="mt-12 flex justify-center"><Button variant="secondary" disabled={items.length >= total} onClick={() => setLimit((current) => current + 24)}>{COPY.shop.loadMore}</Button></div><FilterDrawer open={open} onOpenChange={setOpen} activeCount={activeFilters.length} /></main></div>;
}
