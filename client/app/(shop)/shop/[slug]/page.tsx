// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';

export interface CategoryPageProps { params: Promise<{ slug: string }>; }
export default async function CategoryPage({ params }: CategoryPageProps): Promise<ReactNode> { const { slug } = await params; return <ProductListingPage pageType="category" pageSlug={slug} categoryPath={slug} />; }
