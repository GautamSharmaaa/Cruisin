// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';

export default function ShopPage(): ReactNode { return <ProductListingPage pageType="landing" pageSlug="shop" title="Shop All" />; }
