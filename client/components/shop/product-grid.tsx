// Governed by .rules v1.0
'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ProductCard } from '@/components/shop/product-card';
import { staggerContainer } from '@/lib/animations';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product.types';

export type GridView = 1 | 2 | 4;
export interface ProductGridProps { products: Product[]; view?: GridView; spotlight?: boolean; preferredColor?: string; preferredSize?: string; }
export function ProductGrid({ products, view = 4, spotlight = false, preferredColor, preferredSize }: ProductGridProps): ReactNode {
  const gridClass = view === 1 ? 'mx-auto max-w-3xl grid-cols-1 gap-6' : view === 2 ? 'grid-cols-1 gap-3 md:grid-cols-2 md:gap-px' : 'grid-cols-2 gap-2 sm:gap-px md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
  return <motion.div variants={staggerContainer} initial="initial" animate="animate" className={cn('grid transition duration-300', gridClass, spotlight && 'rounded-sm ring-1 ring-accent-gold/40 shadow-gold')}>{products.map((product, index) => <ProductCard key={product.id} product={product} view={view} priority={index < (view === 4 ? 4 : 2)} preferredColor={preferredColor} preferredSize={preferredSize} />)}</motion.div>;
}
