// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { PublishedCmsSections } from '@/components/home/published-cms-sections';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'new-featured');
  return metadataFromSettings(settings, 'New & Featured');
}

export const dynamic = 'force-dynamic';

export default async function NewFeaturedPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'new-featured');
  return <><Suspense fallback={null}><PublishedCmsSections slug="new-featured" /></Suspense><ProductListingPage pageType="landing" pageSlug="new-featured" initialSettings={settings} featured /></>;
}
