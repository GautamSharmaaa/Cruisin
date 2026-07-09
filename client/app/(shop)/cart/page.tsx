// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { EmptyState } from '@/components/shared/empty-state';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';

export default function CartPage(): ReactNode { const { items } = useCartStore(); const visibleItems = items.filter((item) => isCustomerVisibleProduct(item.product)); const subtotal = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0); return <main className="min-w-0 px-6 py-24 lg:px-20"><h1 className="font-display text-4xl">{COPY.cart.title}</h1>{visibleItems.length === 0 ? <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} /> : <div className="mt-8 grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="min-w-0">{visibleItems.map((item) => <CartItem key={item.product.id + item.variantId} item={item} />)}</div><CartSummary subtotal={subtotal} /></div>}</main>; }
