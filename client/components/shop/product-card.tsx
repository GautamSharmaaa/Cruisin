// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { staggerItem } from '@/lib/animations';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types/product.types';

export interface ProductCardProps { product: Product; }
export function ProductCard({ product }: ProductCardProps): ReactNode { const addItem = useCartStore((state) => state.addItem); const toggle = useWishlistStore((state) => state.toggle); const variant = product.variants[0]; const soldOut = product.variants.every((item) => item.stock === 0); return <motion.article variants={staggerItem} className="group relative border-border-subtle"><Link href={'/product/' + product.slug} className="block"><div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><Image src={product.images[0].url} alt={product.images[0].alt} fill sizes="(min-width:1536px) 25vw, (min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.06]" priority={product.isFeatured} />{product.tags.includes('new') ? <Badge variant="new" className="absolute left-3 top-3">{COPY.shop.new}</Badge> : null}{product.comparePrice ? <Badge variant="sale" className="absolute left-3 top-10">{COPY.shop.sale}</Badge> : null}</div><div className="space-y-2 p-4"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{product.brand}</p><h3 className="line-clamp-2 font-display text-xl text-text-primary">{product.title}</h3><div className="flex gap-3 font-mono text-lg text-accent-gold"><span>{formatPrice(product.basePrice)}</span>{product.comparePrice ? <span className="text-text-muted line-through">{formatPrice(product.comparePrice)}</span> : null}</div></div></Link><button aria-label={COPY.product.wishlist} onClick={() => toggle(product.id)} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-text-secondary opacity-70 transition hover:text-text-primary hover:opacity-100"><Heart size={18} /></button><div className="absolute bottom-[112px] left-0 right-0 translate-y-full opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"><Button className="w-full" disabled={soldOut || !variant} onClick={() => variant ? addItem({ product, variantId: variant.id, size: variant.size, color: variant.color, quantity: 1, price: variant.price }) : undefined}>{soldOut ? COPY.shop.soldOut : COPY.shop.quickAdd}</Button></div></motion.article>; }
