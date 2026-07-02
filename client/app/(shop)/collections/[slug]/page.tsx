// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadCollectionServer, metadataFromSettings } from '@/lib/storefront-server';

export interface CollectionPageProps { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadCollectionServer(slug);
  return metadataFromSettings(collection, (collection?.title ?? 'Collection') + ' | Cruisin', collection?.description);
}

export default async function CollectionPage({ params }: CollectionPageProps): Promise<ReactNode> {
  const { slug } = await params;
  const collection = await loadCollectionServer(slug);
  return <ProductListingPage pageType="collection" pageSlug={slug} collectionSlug={slug} selectedCollection={collection} showCollectionCarousel />;
}
