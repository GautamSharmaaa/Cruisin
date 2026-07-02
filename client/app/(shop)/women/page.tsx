// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'women');
  return metadataFromSettings(settings, 'Women | Cruisin');
}

export default function WomenPage(): ReactNode {
  return <ProductListingPage pageType="landing" pageSlug="women" gender="women" />;
}
