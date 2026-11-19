// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { PublishedCmsSections } from '@/components/home/published-cms-sections';
import { ProductListingPage } from '@/components/shop/product-listing-page';

export const metadata: Metadata = { title: 'Shop All', description: 'Shop the complete Cruisin streetwear collection.', alternates: { canonical: '/shop' } };

export const dynamic = 'force-dynamic';

export default function ShopPage(): ReactNode { return <><Suspense fallback={null}><PublishedCmsSections slug="shop" /></Suspense><ProductListingPage pageType="landing" pageSlug="shop" title="Shop All" /></>; }
