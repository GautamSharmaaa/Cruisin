// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AnimatedCartItems } from '@/components/cart/animated-cart-items';
import { CartSummary } from '@/components/cart/cart-summary';
import { CompleteTheFit } from '@/components/cart/complete-the-fit';
import { CouponInput } from '@/components/cart/coupon-input';
import { PromotionMarquee } from '@/components/promotion/promotion-marquee';
import { Drawer } from '@/components/shared/drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';

export interface CartDrawerProps { }

export function CartDrawer(_props: CartDrawerProps): ReactNode {
  const { items, isOpen, closeCart, couponDiscount, freeShipping } = useCartStore();
  const siteSettings = useSiteSettings();
  const visibleItems = items.filter((item) => isCustomerVisibleProduct(item.product));
  const subtotal = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => open ? undefined : closeCart()} title={COPY.cart.title}>
      {visibleItems.length === 0 ? (
        <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} />
      ) : (
        <div>
          <PromotionMarquee />
          <div className="px-5 md:px-0"><AnimatedCartItems items={visibleItems} prioritizeFirst={isOpen} /></div>
          <CompleteTheFit context="drawer" />
          <div className="space-y-7 px-5 py-8 md:px-0 md:py-6">
            <CouponInput />
            <CartSummary
              subtotal={subtotal}
              discount={couponDiscount}
              freeShipping={freeShipping}
              shippingSettings={siteSettings.data}
              onCheckout={closeCart}
              mobileStickyCheckout
            />
            <Link href={ROUTES.shop} className="hidden h-11 w-full min-w-11 items-center justify-center border border-border px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition duration-300 hover:border-border-strong hover:bg-background-elevated active:scale-[0.98] md:inline-flex">{COPY.cart.continue}</Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}
