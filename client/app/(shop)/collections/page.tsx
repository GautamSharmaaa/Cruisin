// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { PublishedCmsSections } from '@/components/home/published-cms-sections';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('collections', 'index');
  return metadataFromSettings(settings, 'Collections');
}

export const dynamic = 'force-dynamic';

export default async function CollectionsPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('collections', 'index');
  return <><Suspense fallback={null}><PublishedCmsSections slug="collections" /></Suspense><ProductListingPage pageType="collections" pageSlug="index" initialSettings={settings} showCollectionCarousel /></>;
}
