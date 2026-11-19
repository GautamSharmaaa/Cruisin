// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { PublishedCmsSections } from '@/components/home/published-cms-sections';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'sale');
  return metadataFromSettings(settings, 'Sale');
}

export const dynamic = 'force-dynamic';

export default async function SalePage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'sale');
  return <><Suspense fallback={null}><PublishedCmsSections slug="sale" /></Suspense><ProductListingPage pageType="landing" pageSlug="sale" initialSettings={settings} sale /></>;
}
