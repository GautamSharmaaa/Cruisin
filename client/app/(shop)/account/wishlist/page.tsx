// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ProductGrid } from '@/components/shop/product-grid';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useProducts } from '@/hooks/useProducts';
import { useWishlistStore } from '@/store/wishlistStore';
export default function AccountPage(): ReactNode { const ids = useWishlistStore((state) => state.ids); const products = useProducts({ limit: 100 }); const wishlist = (products.data?.items ?? []).filter((product) => ids.includes(product.id)); return <main className="px-6 py-32 lg:px-20"><div className="mx-auto max-w-[1440px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">Private client edit</p><div className="mt-4 border-b border-border pb-8"><h1 className="font-display text-4xl">{COPY.account.wishlist}</h1><p className="mt-3 max-w-xl text-sm text-text-secondary">Your saved pieces are available across every signed-in session.</p></div><div className="mt-8">{wishlist.length > 0 ? <ProductGrid products={wishlist} /> : <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} />}</div></div></main>; }
