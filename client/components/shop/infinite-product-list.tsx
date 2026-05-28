// Governed by .rules v1.0
'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ProductGrid } from '@/components/shop/product-grid';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { FilterDrawer } from '@/components/shop/filter-drawer';
import { SortSelect } from '@/components/shop/sort-select';
import { COPY } from '@/constants/copy';
import { PRODUCTS } from '@/constants/catalog';

export interface InfiniteProductListProps { initialCategory?: string; }
export function InfiniteProductList({ initialCategory }: InfiniteProductListProps): ReactNode { const [sort, setSort] = useState('newest'); const [open, setOpen] = useState(false); const products = useMemo(() => initialCategory ? PRODUCTS.filter((product) => product.category.toLowerCase() === initialCategory.toLowerCase()) : PRODUCTS, [initialCategory]); return <div className="flex"><FilterSidebar activeCount={initialCategory ? 1 : 0} /><main className="min-w-0 flex-1 px-6 py-24 lg:px-12"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-4xl text-text-primary">{COPY.shop.title}</h1><p className="mt-2 text-sm text-text-secondary">{COPY.shop.showing} {products.length} {COPY.shop.items}</p></div><div className="flex gap-3"><Button variant="secondary" className="lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal size={16} /> {COPY.shop.filters}</Button><SortSelect value={sort} onChange={setSort} /></div></div>{products.length > 0 ? <ProductGrid products={products} /> : <EmptyState title={COPY.shop.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.shop.emptyCta} href="/shop" />}<div className="mt-12 flex justify-center"><Button variant="secondary">{COPY.shop.loadMore}</Button></div><FilterDrawer open={open} onOpenChange={setOpen} activeCount={initialCategory ? 1 : 0} /></main></div>; }
