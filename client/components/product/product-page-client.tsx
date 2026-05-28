// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ProductDetail } from '@/components/product/product-detail';
import { RecommendedProducts } from '@/components/product/recommended-products';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { COPY } from '@/constants/copy';
import { useProduct } from '@/hooks/useProduct';

export interface ProductPageClientProps {
  slug: string;
}

export function ProductPageClient({ slug }: ProductPageClientProps): ReactNode {
  const product = useProduct(slug);
  if (product.isLoading) return <main className="grid gap-12 px-6 py-24 lg:grid-cols-2 lg:px-20"><SkeletonCard /><SkeletonCard /></main>;
  if (!product.data) return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-4xl">{COPY.shop.emptyTitle}</h1></main>;
  return <><ProductDetail product={product.data} /><RecommendedProducts excludeSlug={product.data.slug} /><RecentlyViewed /></>;
}
