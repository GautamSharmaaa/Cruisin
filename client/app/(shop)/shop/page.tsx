// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';

export const metadata: Metadata = { title: 'Shop All', description: 'Shop the complete Cruisin streetwear collection.', alternates: { canonical: '/shop' } };

export default function ShopPage(): ReactNode { return <ProductListingPage pageType="landing" pageSlug="shop" title="Shop All" />; }
