// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ProductDetail } from '@/components/product/product-detail';
import { RecommendedProducts } from '@/components/product/recommended-products';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { COPY } from '@/constants/copy';
import { useProduct } from '@/hooks/useProduct';
import { filterCustomerVisibleProducts, isCustomerVisibleProduct } from '@/lib/customer-state';

export interface ProductPageClientProps {
  slug: string;
}

export function ProductPageClient({ slug }: ProductPageClientProps): ReactNode {
  const product = useProduct(slug);
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
  if (!product.data) return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-4xl">{COPY.shop.emptyTitle}</h1></main>;
  return <><ProductDetail product={product.data} /><RecommendedProducts excludeSlug={product.data.slug} /><RecentlyViewed /></>;
}
