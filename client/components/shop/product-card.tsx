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
import { cinematicPanel } from '@/lib/animations';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types/product.types';

export interface ProductCardProps { product: Product; }
export function ProductCard({ product }: ProductCardProps): ReactNode { const addItem = useCartStore((state) => state.addItem); const toggle = useWishlistStore((state) => state.toggle); const variant = product.variants[0]; const soldOut = product.variants.every((item) => item.stock === 0); return <motion.article variants={cinematicPanel} whileHover={{ y: -6 }} className="group relative overflow-hidden border border-border-subtle bg-background-primary transition-colors duration-500 hover:border-border-strong"><Link href={'/product/' + product.slug} className="block"><div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><Image src={product.images[0].url} alt={product.images[0].alt} fill sizes="(min-width:1536px) 25vw, (min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" className="object-cover opacity-90 transition duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.06] group-hover:opacity-100" priority={product.isFeatured} /><div className="absolute inset-0 bg-gradient-to-t from-background-primary via-transparent to-transparent opacity-70 transition duration-500 group-hover:opacity-40" />{product.tags.includes('new') ? <Badge variant="new" className="absolute left-4 top-4">{COPY.shop.new}</Badge> : null}{product.comparePrice ? <Badge variant="sale" className="absolute left-4 top-12">{COPY.shop.sale}</Badge> : null}<div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 opacity-0 transition duration-500 group-hover:opacity-100"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{product.brand}</p><p className="font-mono text-xs text-text-secondary">{variant?.sku}</p></div></div><div className="min-h-36 space-y-3 p-5 md:p-6"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{product.category}</p><h3 className="line-clamp-2 font-display text-2xl text-text-primary transition duration-300 group-hover:text-accent-white">{product.title}</h3><div className="flex flex-wrap gap-3 font-mono text-lg text-accent-gold"><span>{formatPrice(product.basePrice)}</span>{product.comparePrice ? <span className="text-text-muted line-through">{formatPrice(product.comparePrice)}</span> : null}</div></div></Link><button aria-label={COPY.product.wishlist} onClick={() => toggle(product.id)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center bg-background-primary/50 text-text-secondary opacity-80 backdrop-blur-xl transition hover:bg-background-elevated hover:text-accent-gold hover:opacity-100"><Heart size={18} /></button><div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><Button className="w-full shadow-gold" disabled={soldOut || !variant} onClick={() => variant ? addItem({ product, variantId: variant.id, size: variant.size, color: variant.color, quantity: 1, price: variant.price }) : undefined}>{soldOut ? COPY.shop.soldOut : COPY.shop.quickAdd}</Button></div></motion.article>; }
