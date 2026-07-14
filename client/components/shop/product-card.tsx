// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { SafeImage } from '@/components/shared/safe-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { cinematicPanel } from '@/lib/animations';
import { api } from '@/lib/api';
import { selectCardVariant } from '@/lib/variant-utils';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types/product.types';
import type { GridView } from '@/components/shop/product-grid';

export interface ProductCardProps { product: Product; view?: GridView; priority?: boolean; preferredColor?: string; preferredSize?: string; }
export function ProductCard({ product, view = 4, priority = false, preferredColor, preferredSize }: ProductCardProps): ReactNode {
  const addItem = useCartStore((state) => state.addItem);
  const toggle = useWishlistStore((state) => state.toggle);
  const has = useWishlistStore((state) => state.has(product.id));
  const accessToken = useAuthStore((state) => state.accessToken);
  const [wishlistPrompt, setWishlistPrompt] = useState(false);
  const selected = selectCardVariant(product.variants, preferredColor, preferredSize);
  const variant = selected.display;
  const quickAddVariant = selected.purchasable;
  const productColors = Array.from(new Map(product.variants.filter((item) => item.enabled !== false).map((item) => [item.color.trim().toLowerCase(), item])).values());
  const soldOut = !quickAddVariant;
  const image = variant?.images[0] ?? product.images[0] ?? { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85', alt: product.title, width: 1200, height: 1600 };
  const hoverImage = variant?.images[1] ?? product.hoverImage ?? product.images[1] ?? null;
  const titleClass = view === 1 ? 'font-display text-3xl text-text-primary transition duration-300 group-hover:text-accent-white' : 'line-clamp-2 font-display text-xl text-text-primary transition duration-300 group-hover:text-accent-white md:text-2xl';
  const handleWishlist = (): void => { if (!accessToken) { setWishlistPrompt(true); return; } toggle(product.id); void api.post(`/wishlist/${product.id}`).catch(() => toggle(product.id)); };
  return <><motion.article variants={cinematicPanel} whileHover={{ y: -6 }} className="group relative overflow-hidden border border-border-subtle bg-background-primary transition-colors duration-500 hover:border-border-strong"><Link href={'/product/' + product.slug} className="block"><div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={image.url} alt={image.alt} fill sizes={view === 1 ? '(min-width:768px) 50vw, 100vw' : '(min-width:1536px) 25vw, (min-width:1280px) 33vw, (min-width:768px) 50vw, 50vw'} className="object-cover opacity-90 transition duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.06] group-hover:opacity-100" priority={priority || product.isFeatured} />{hoverImage ? <SafeImage src={hoverImage.url} alt={hoverImage.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover opacity-0 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-background-primary via-transparent to-transparent opacity-70 transition duration-500 group-hover:opacity-40" />{product.tags.includes('new') || product.isNewArrival ? <Badge variant="new" className="absolute left-4 top-4">{COPY.shop.new}</Badge> : null}{product.comparePrice || product.isSale ? <Badge variant="sale" className="absolute left-4 top-12">{COPY.shop.sale}</Badge> : null}<div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 opacity-0 transition duration-500 group-hover:opacity-100"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{product.brand}</p><p className="font-mono text-xs text-text-secondary">{variant?.sku}</p></div></div><div className="min-h-36 space-y-3 p-4 md:p-6"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{product.category}</p><h3 className={titleClass}>{product.title}</h3><div className="flex flex-wrap gap-3 font-mono text-base text-accent-gold md:text-lg"><span>{formatPrice(variant?.price ?? product.basePrice)}</span>{product.comparePrice ? <span className="text-text-muted line-through">{formatPrice(product.comparePrice)}</span> : null}</div>{productColors.length ? <div className="flex min-h-5 flex-wrap items-center gap-2" aria-label={`${productColors.length} colors available`}>{productColors.slice(0, 6).map((item) => <span key={item.color.toLowerCase()} title={item.color} aria-label={item.color} className={'h-4 w-4 rounded-full border shadow-inner ' + (preferredColor?.trim().toLowerCase() === item.color.trim().toLowerCase() ? 'border-accent-gold ring-1 ring-accent-gold' : 'border-border-strong')} style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(item.colorHex) ? item.colorHex : '#777777' }} />)}{productColors.length > 6 ? <span className="font-mono text-[10px] text-text-muted">+{productColors.length - 6}</span> : null}</div> : null}</div></Link><button type="button" aria-pressed={has} aria-label={COPY.product.wishlist} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleWishlist(); }} className={'absolute right-4 top-4 flex h-11 w-11 items-center justify-center bg-background-primary/60 opacity-90 backdrop-blur-xl transition hover:bg-background-elevated hover:text-accent-gold hover:opacity-100 ' + (has ? 'text-accent-gold shadow-gold' : 'text-text-secondary')}><Heart size={18} fill={has ? 'currentColor' : 'none'} /></button><div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><Button className="w-full shadow-gold" disabled={soldOut} onClick={() => quickAddVariant ? addItem({ product, variantId: quickAddVariant.id, size: quickAddVariant.size, color: quickAddVariant.color, quantity: 1, price: quickAddVariant.price }) : undefined}>{soldOut ? COPY.shop.soldOut : COPY.shop.quickAdd}</Button></div></motion.article><LoginRequiredModal open={wishlistPrompt} onOpenChange={setWishlistPrompt} next={`/product/${product.slug}`} action="wishlist" /></>;
}
