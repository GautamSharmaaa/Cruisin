// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { EditorialProductCard } from '@/components/shop/editorial-product-card';
import { STOREFRONT_COPY as C } from '@/constants/storefront-copy';
import { COPY } from '@/constants/copy';
import { useProducts } from '@/hooks/useProducts';

export interface RecommendedProductsProps { excludeSlug: string; }
export function RecommendedProducts({excludeSlug}:RecommendedProductsProps):ReactNode{const products=useProducts({limit:8});const items=(products.data?.items??[]).filter(product=>product.slug!==excludeSlug).slice(0,4);if(!items.length)return null;return <section className="pdp-related"><h2>{C.related}</h2><div className="collection-product-grid">{items.map(product=><EditorialProductCard product={product} key={product.id}/>)}</div></section>;}
