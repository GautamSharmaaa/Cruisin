// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'men');
  return metadataFromSettings(settings, 'Men');
}

export default async function MenPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'men');
  return <ProductListingPage pageType="landing" pageSlug="men" initialSettings={settings} gender="men" />;
}
