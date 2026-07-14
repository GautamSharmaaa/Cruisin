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
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';

export interface CartDrawerProps { }
export function CartDrawer(_props: CartDrawerProps): ReactNode { const { items, isOpen, closeCart, couponDiscount, freeShipping } = useCartStore(); const visibleItems = items.filter((item) => isCustomerVisibleProduct(item.product)); const total = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0); return <Drawer open={isOpen} onOpenChange={(open) => open ? undefined : closeCart()} title={COPY.cart.title}>{visibleItems.length === 0 ? <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} /> : <div className="space-y-6">{visibleItems.map((item) => <CartItem key={item.product.id + item.variantId} item={item} />)}<ShippingProgress subtotal={total} /><CouponInput /><CartSummary subtotal={total} discount={couponDiscount} freeShipping={freeShipping} onCheckout={closeCart} /><Link href={ROUTES.shop} className="inline-flex h-11 w-full min-w-11 items-center justify-center border border-border px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition duration-300 hover:border-border-strong hover:bg-background-elevated active:scale-[0.98]">{COPY.cart.continue}</Link></div>}</Drawer>; }
