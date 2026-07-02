// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadCategoryServer, metadataFromSettings } from '@/lib/storefront-server';

export interface CategoryPageProps { params: Promise<{ slug: string[] }>; }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const category = await loadCategoryServer(path);
  return metadataFromSettings(category, (category?.name ?? 'Category') + ' | Cruisin', category?.description);
}

export default async function CategoryPage({ params }: CategoryPageProps): Promise<ReactNode> {
  const { slug } = await params;
  const path = slug.join('/');
  return <ProductListingPage pageType="category" pageSlug={path} categoryPath={path} />;
}
