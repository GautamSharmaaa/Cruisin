// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ProductDetail } from '@/components/product/product-detail';
import { RecommendedProducts } from '@/components/product/recommended-products';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useProduct } from '@/hooks/useProduct';
import { filterCustomerVisibleProducts, isCustomerVisibleProduct } from '@/lib/customer-state';
import { trackProductView } from '@/lib/meta-ecommerce';

export interface ProductPageClientProps {
  slug: string;
}

export function ProductPageClient({ slug }: ProductPageClientProps): ReactNode {
  const product = useProduct(slug);
  useEffect(() => {
    if (product.data) trackProductView(product.data);
  }, [product.data]);
  useEffect(() => {
    if (!product.data) return;
    try {
      const key = 'cruisin_recently_viewed_products';
      const raw = window.localStorage.getItem(key);
      const current = raw ? JSON.parse(raw) as Array<{ slug?: string }> : [];
      const currentProducts = Array.isArray(current) ? filterCustomerVisibleProducts(current) : [];
      const next = (isCustomerVisibleProduct(product.data) ? [product.data, ...currentProducts.filter((item) => item.slug !== product.data?.slug)] : currentProducts).slice(0, 8);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (_error: unknown) {
      // Recently viewed is a non-critical personalization enhancement.
    }
  }, [product.data]);
  if (product.isLoading) return <main className="grid gap-12 px-6 py-24 lg:grid-cols-2 lg:px-20"><SkeletonCard /><SkeletonCard /></main>;
  if (!product.data) return <main className="px-6 py-32 text-center lg:px-20"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Product unavailable</p><h1 className="mt-4 font-display text-4xl text-text-primary">{COPY.shop.emptyTitle}</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-secondary">This piece is no longer published or cannot be found. Your cart and account are unchanged.</p><Link href={ROUTES.shop} className="mt-8 inline-flex h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]">{COPY.shop.emptyCta}</Link></section></main>;
  return <><ProductDetail product={product.data} /><RecommendedProducts excludeSlug={product.data.slug} /><RecentlyViewed /></>;
}
