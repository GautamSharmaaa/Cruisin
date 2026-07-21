// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'new-featured');
  return metadataFromSettings(settings, 'New & Featured');
}

export default async function NewFeaturedPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'new-featured');
  return <ProductListingPage pageType="landing" pageSlug="new-featured" initialSettings={settings} featured />;
}
