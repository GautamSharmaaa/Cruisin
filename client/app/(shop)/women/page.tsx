// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'women');
  return metadataFromSettings(settings, 'Women');
}

export default async function WomenPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'women');
  return <ProductListingPage pageType="landing" pageSlug="women" initialSettings={settings} gender="women" />;
}
