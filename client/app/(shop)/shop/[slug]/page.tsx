// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { InfiniteProductList } from '@/components/shop/infinite-product-list';

export interface CategoryPageProps { params: Promise<{ slug: string }>; }
export default async function CategoryPage({ params }: CategoryPageProps): Promise<ReactNode> { const { slug } = await params; return <InfiniteProductList initialCategory={slug} />; }
