// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { CouponInput } from '@/components/cart/coupon-input';
import { ShippingProgress } from '@/components/cart/shipping-progress';
import { Drawer } from '@/components/shared/drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useCartStore } from '@/store/cartStore';

export interface CartDrawerProps { }
export function CartDrawer(_props: CartDrawerProps): ReactNode { const { items, isOpen, closeCart, subtotal } = useCartStore(); const total = subtotal(); return <Drawer open={isOpen} onOpenChange={(open) => open ? undefined : closeCart()} title={COPY.cart.title}>{items.length === 0 ? <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} /> : <div className="space-y-6">{items.map((item) => <CartItem key={item.product.id + item.variantId} item={item} />)}<ShippingProgress subtotal={total} /><CouponInput /><CartSummary subtotal={total} /><Button variant="secondary" className="w-full"><Link href={ROUTES.shop}>{COPY.cart.continue}</Link></Button></div>}</Drawer>; }
