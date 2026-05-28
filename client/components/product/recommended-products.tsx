// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { ProductGrid } from '@/components/shop/product-grid';
import { PRODUCTS } from '@/constants/catalog';
import { COPY } from '@/constants/copy';

export interface RecommendedProductsProps { excludeSlug: string; }
export function RecommendedProducts({ excludeSlug }: RecommendedProductsProps): ReactNode { return <section className="px-6 py-20 lg:px-20"><h2 className="mb-12 font-display text-3xl">{COPY.product.recommended}</h2><ProductGrid products={PRODUCTS.filter((product) => product.slug !== excludeSlug).slice(0, 3)} /></section>; }
