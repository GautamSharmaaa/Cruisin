// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { EmptyState } from '@/components/shared/empty-state';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useCartStore } from '@/store/cartStore';

export default function CartPage(): ReactNode { const { items, subtotal } = useCartStore(); return <main className="px-6 py-24 lg:px-20"><h1 className="font-display text-4xl">{COPY.cart.title}</h1>{items.length === 0 ? <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} /> : <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]"><div>{items.map((item) => <CartItem key={item.product.id + item.variantId} item={item} />)}</div><CartSummary subtotal={subtotal()} /></div>}</main>; }
