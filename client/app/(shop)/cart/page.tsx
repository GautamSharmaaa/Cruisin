// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { CouponInput } from '@/components/cart/coupon-input';
import { ShippingProgress } from '@/components/cart/shipping-progress';
import { PromotionMarquee } from '@/components/promotion/promotion-marquee';
import { EmptyState } from '@/components/shared/empty-state';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { FREE_STANDARD_SHIPPING_THRESHOLD, STANDARD_SHIPPING_RATE } from '@/lib/shipping';
import { useCartStore } from '@/store/cartStore';

export default function CartPage(): ReactNode {
  const { items, couponDiscount, freeShipping } = useCartStore();
  const siteSettings = useSiteSettings();
  const visibleItems = items.filter((item) => isCustomerVisibleProduct(item.product));
  const subtotal = visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const standardRate = siteSettings.data?.standardShippingRate ?? STANDARD_SHIPPING_RATE;
  const freeThreshold = !freeShipping && standardRate > 0
    ? siteSettings.data?.freeStandardShippingThreshold ?? FREE_STANDARD_SHIPPING_THRESHOLD
    : 0;

  return (
    <main className="min-w-0 px-6 py-24 lg:px-20">
      <h1 className="font-display text-4xl">{COPY.cart.title}</h1>
      <PromotionMarquee className="mt-6" />
      {visibleItems.length === 0 ? (
        <EmptyState title={COPY.cart.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.cart.continue} href={ROUTES.shop} />
      ) : (
        <div className="mt-8 grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{visibleItems.map((item, index) => <CartItem key={item.product.id + item.variantId} item={item} priority={index === 0} />)}</div>
          <aside className="space-y-6">
            <ShippingProgress subtotal={discountedSubtotal} threshold={freeThreshold} />
            <CouponInput />
            <CartSummary subtotal={subtotal} discount={couponDiscount} freeShipping={freeShipping} shippingSettings={siteSettings.data} />
          </aside>
        </div>
      )}
    </main>
  );
}
