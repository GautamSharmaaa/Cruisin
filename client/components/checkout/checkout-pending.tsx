// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { clearCheckoutAttempt } from '@/hooks/useCheckout';
import { useOrder } from '@/hooks/useOrders';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from '@/lib/payment-status';
import { useCartStore } from '@/store/cartStore';

export interface CheckoutPendingProps {
  orderId?: string;
}

const primaryLink = 'inline-flex h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]';
const secondaryLink = 'inline-flex h-11 min-w-11 items-center justify-center border border-border px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition duration-300 hover:border-border-strong hover:bg-background-elevated active:scale-[0.98]';

function PendingContent({ orderId }: CheckoutPendingProps): ReactNode {
  const router = useRouter();
  const order = useOrder(orderId, { pollPaymentStatus: true });
  useEffect(() => {
    if (!order.data || !isOrderPaymentConfirmed(order.data)) return;
    clearCheckoutAttempt();
    useCartStore.getState().clearCart();
    router.replace(ROUTES.checkoutSuccess + '?order=' + encodeURIComponent(orderId ?? ''));
  }, [order.data, orderId, router]);

  if (!orderId || order.isError) {
    return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.pending}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.statusUnavailable}</p><Link href={ROUTES.orders} className={primaryLink + ' mt-8'}>{COPY.checkout.myOrders}</Link></main>;
  }
  if (!order.data) {
    return <main className="px-6 py-32 text-center lg:px-20" aria-busy="true"><div className="mx-auto h-4 w-32 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="mx-auto mt-6 h-12 max-w-sm animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></main>;
  }
  const orderPath = order.data.id ?? order.data._id;
  if (isOrderPaymentFailed(order.data)) {
    return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{order.data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.failure}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.failureBody}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={ROUTES.checkout} className={primaryLink}>{COPY.checkout.retry}</Link><Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div></main>;
  }
  return <main className="px-6 py-32 text-center lg:px-20" aria-live="polite"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{order.data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.pending}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.pendingBody}</p><p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{COPY.checkout.pendingHint}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{orderPath ? <Link href={ROUTES.orders + '/' + orderPath} className={primaryLink}>{COPY.checkout.viewOrder}</Link> : null}<Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div></main>;
}

export function CheckoutPending({ orderId }: CheckoutPendingProps): ReactNode {
  return <AccountGuard><PendingContent orderId={orderId} /></AccountGuard>;
}
