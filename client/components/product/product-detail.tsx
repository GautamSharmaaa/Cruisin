// Governed by .rules v1.0
'use client';

import { Share2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AddToCartButton } from '@/components/product/add-to-cart-button';
import { ImageGallery } from '@/components/product/image-gallery';
import { ReviewSection } from '@/components/product/review-section';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { VariantSelector } from '@/components/product/variant-selector';
import { WishlistButton } from '@/components/product/wishlist-button';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types/product.types';

export interface ProductDetailProps { product: Product; }
export function ProductDetail({ product }: ProductDetailProps): ReactNode { const [variant, setVariant] = useState<ProductVariant | null>(null); const stock = variant?.stock ?? product.variants[0]?.stock ?? 0; const share = (): void => { void navigator.clipboard.writeText(window.location.href); }; return <main className="px-6 pb-20 pt-24 lg:px-20"><Breadcrumb items={[{ label: COPY.nav.home, href: ROUTES.home }, { label: COPY.nav.shop, href: ROUTES.shop }, { label: product.title, href: '/product/' + product.slug }]} /><div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]"><ImageGallery images={product.images} /><section className="lg:sticky lg:top-24 lg:self-start"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{product.brand}</p><h1 className="mt-3 font-display text-4xl font-light text-text-primary">{product.title}</h1><p className="mt-4 font-mono text-xl text-accent-gold">{formatPrice(product.basePrice)}</p>{stock > 0 && stock < 5 ? <p className="mt-3 text-sm text-warning">{COPY.product.onlyLeft.replace('{count}', String(stock))}</p> : null}<div className="mt-10"><VariantSelector variants={product.variants} onChange={setVariant} /></div><div className="mt-6 flex gap-3"><SizeGuideModal /><WishlistButton productId={product.id} /><Button variant="ghost" onClick={share}><Share2 size={16} /> {COPY.product.share}</Button></div><div className="mt-8"><AddToCartButton product={product} variant={variant} /></div><details className="mt-10 border-t border-border py-6" open><summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">{COPY.product.description}</summary><p className="mt-4 text-text-secondary">{product.richDescription}</p></details><details className="border-t border-border py-6"><summary className="cursor-pointer font-accent text-xs uppercase tracking-[0.15em]">{COPY.product.shipping}</summary><p className="mt-4 text-text-secondary">{COPY.home.newsletterBody}</p></details></section></div><ReviewSection reviews={product.reviews} rating={product.ratings.avg} count={product.ratings.count} /></main>; }
