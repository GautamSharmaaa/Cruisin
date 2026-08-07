// Governed by .rules v1.0
'use client';

import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { SafeImage } from '@/components/shared/safe-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { cinematicPanel } from '@/lib/animations';
import { api } from '@/lib/api';
import { addProductToCart, performWishlistToggle } from '@/lib/meta-actions';
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
  const { openMobileAuth } = useMobileAuthSheet();
  const [wishlistPrompt, setWishlistPrompt] = useState(false);
  const selected = selectCardVariant(product.variants, preferredColor, preferredSize);
  const variant = selected.display;
  const quickAddVariant = selected.purchasable;
  const productColors = Array.from(new Map(product.variants.filter((item) => item.enabled !== false).map((item) => [item.color.trim().toLowerCase(), item])).values());
  const soldOut = !quickAddVariant;
  const image = variant?.images[0] ?? product.images[0] ?? { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85', alt: product.title, width: 1200, height: 1600 };
  const hoverImage = variant?.images[1] ?? product.hoverImage ?? product.images[1] ?? null;
  const titleClass = view === 1 ? 'font-display text-3xl text-text-primary transition duration-300 group-hover:text-accent-white' : 'line-clamp-2 font-display text-lg text-text-primary transition duration-300 group-hover:text-accent-white sm:text-xl md:text-2xl';
  const handleWishlist = async (): Promise<void> => { if (!accessToken) { if (window.matchMedia('(max-width: 767px)').matches) openMobileAuth({ next: `/product/${product.slug}` }); else setWishlistPrompt(true); return; } await performWishlistToggle({ authenticated: true, product, variant: quickAddVariant ?? variant, isWishlisted: has, toggle: () => toggle(product.id), request: () => api.post(`/wishlist/${product.id}`) }); };
  return <><motion.article variants={cinematicPanel} whileHover={{ y: -6 }} className="group relative overflow-hidden border border-border-subtle bg-background-primary transition-colors duration-500 hover:border-border-strong"><Link href={'/product/' + product.slug} className="block"><div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={image.url} alt={image.alt} fill sizes={view === 1 ? '(min-width:768px) 50vw, 100vw' : '(min-width:1536px) 25vw, (min-width:1280px) 33vw, (min-width:768px) 50vw, 50vw'} className="object-cover opacity-90 transition duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.06] group-hover:opacity-100" priority={priority || product.isFeatured} />{hoverImage ? <SafeImage src={hoverImage.url} alt={hoverImage.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover opacity-0 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-background-primary via-transparent to-transparent opacity-70 transition duration-500 group-hover:opacity-40" />{product.tags.includes('new') || product.isNewArrival ? <Badge variant="new" className="absolute left-3 top-3 sm:left-4 sm:top-4">{COPY.shop.new}</Badge> : null}{product.comparePrice || product.isSale ? <Badge variant="sale" className="absolute left-3 top-11 sm:left-4 sm:top-12">{COPY.shop.sale}</Badge> : null}<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 opacity-100 transition duration-500 sm:bottom-4 sm:left-4 sm:right-4 md:items-end md:gap-3 md:opacity-0 md:group-hover:opacity-100"><p className="shrink-0 font-accent text-[10px] uppercase leading-none tracking-[0.16em] text-accent-gold md:text-xs md:leading-normal md:tracking-[0.18em]">{product.brand}</p>{variant?.sku ? <p className="ml-auto hidden whitespace-nowrap text-right font-mono text-xs leading-4 text-text-secondary md:block">{variant.sku}</p> : null}</div></div><div className="min-h-36 space-y-3 p-3 sm:p-4 md:p-6"><p className="font-accent text-[11px] uppercase tracking-[0.14em] text-accent-gold sm:text-xs sm:tracking-[0.18em]">{product.category}</p><h3 className={titleClass}>{product.title}</h3><div className="flex flex-wrap gap-2 font-mono text-sm text-accent-gold sm:gap-3 sm:text-base md:text-lg"><span>{formatPrice(variant?.price ?? product.basePrice)}</span>{product.comparePrice ? <span className="text-text-muted line-through">{formatPrice(product.comparePrice)}</span> : null}</div>{productColors.length ? <div className="flex min-h-5 flex-wrap items-center gap-2" aria-label={`${productColors.length} colors available`}>{productColors.slice(0, 6).map((item) => <span key={item.color.toLowerCase()} title={item.color} aria-label={item.color} className={'h-4 w-4 rounded-full border shadow-inner ' + (preferredColor?.trim().toLowerCase() === item.color.trim().toLowerCase() ? 'border-accent-gold ring-1 ring-accent-gold' : 'border-border-strong')} style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(item.colorHex) ? item.colorHex : '#777777' }} />)}{productColors.length > 6 ? <span className="font-mono text-[10px] text-text-muted">+{productColors.length - 6}</span> : null}</div> : null}</div></Link><button type="button" aria-pressed={has} aria-label={COPY.product.wishlist} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleWishlist(); }} className={'absolute right-3 top-3 flex h-10 w-10 items-center justify-center bg-background-primary/60 opacity-90 backdrop-blur-xl transition hover:bg-background-elevated hover:text-accent-gold hover:opacity-100 sm:right-4 sm:top-4 sm:h-11 sm:w-11 ' + (has ? 'text-accent-gold shadow-gold' : 'text-text-secondary')}><Heart size={18} fill={has ? 'currentColor' : 'none'} /></button><div className="relative opacity-100 transition duration-300 md:absolute md:inset-x-0 md:bottom-0 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"><Button className="w-full shadow-gold" disabled={soldOut} onClick={() => { if (quickAddVariant) addProductToCart({ product, variant: quickAddVariant, quantity: 1, addItem }); }}>{soldOut ? COPY.shop.soldOut : COPY.shop.quickAdd}</Button></div></motion.article><LoginRequiredModal open={wishlistPrompt} onOpenChange={setWishlistPrompt} next={`/product/${product.slug}`} action="wishlist" /></>;
}
