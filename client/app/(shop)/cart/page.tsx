// Governed by .rules v1.0
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatedCartItems } from '@/components/cart/animated-cart-items';
import { CartSummary } from '@/components/cart/cart-summary';
import { CompleteTheFit } from '@/components/cart/complete-the-fit';
import { CouponInput } from '@/components/cart/coupon-input';
import { CheckoutFlowHeader } from '@/components/checkout/checkout-flow-header';
import { PromotionMarquee } from '@/components/promotion/promotion-marquee';
import { EmptyState } from '@/components/shared/empty-state';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';

export default function CartPage(): ReactNode {
  const [mounted, setMounted] = useState(false);
  const { items, couponDiscount, freeShipping } = useCartStore();
  const siteSettings = useSiteSettings();
  const visibleItems = items.filter((item) => isCustomerVisibleProduct(item.product));
  const subtotal = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <main className="min-w-0 pb-28 md:px-6 md:py-24 lg:px-20" aria-busy="true">
    <CheckoutFlowHeader backHref={ROUTES.shop} backLabel="Shop" secureHref={ROUTES.checkout} />
    <div className="mx-5 mt-5 h-11 animate-shimmer border-y border-border-subtle bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%] md:mx-0" />
    <div className="mx-5 mt-5 h-36 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%] md:mx-0" />
  </main>;

  return (
    <main className="min-w-0 pb-28 md:px-6 md:py-24 lg:px-20">
      <CheckoutFlowHeader backHref={ROUTES.shop} backLabel="Shop" secureHref={ROUTES.checkout} />
      <div className="hidden md:block md:p-0">
        <h1 className="font-display text-4xl font-light">{COPY.cart.title}</h1>
      </div>
      <PromotionMarquee className="md:mt-6" />
      {visibleItems.length === 0 ? (
        <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} />
      ) : (
        <div className="grid min-w-0 gap-0 md:mt-8 md:gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0"><div className="border-b border-border-subtle px-5 md:border-0 md:px-0"><AnimatedCartItems items={visibleItems} prioritizeFirst /></div><CompleteTheFit context="page" /></div>
          <aside className="space-y-7 px-5 py-8 md:px-0 md:py-0">
            <CouponInput />
            <CartSummary subtotal={subtotal} discount={couponDiscount} freeShipping={freeShipping} shippingSettings={siteSettings.data} mobileStickyCheckout />
          </aside>
        </div>
      )}
    </main>
  );
}
