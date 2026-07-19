// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useOrder } from '@/hooks/useOrders';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from '@/lib/payment-status';
import { formatPrice } from '@/lib/utils';

export interface CheckoutSuccessProps { orderId?: string; }

const primaryLink = 'inline-flex h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]';
const secondaryLink = 'inline-flex h-11 min-w-11 items-center justify-center border border-border px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition duration-300 hover:border-border-strong hover:bg-background-elevated active:scale-[0.98]';

function SuccessContent({ orderId }: CheckoutSuccessProps): ReactNode {
  const order = useOrder(orderId);
  if (!orderId || order.isError) return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Order status</p><h1 className="mt-4 font-display text-5xl">We couldn’t find that order</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">Open your orders to view purchases associated with your account.</p><div className="mt-8"><Link href={ROUTES.orders} className={primaryLink}>My orders</Link></div></main>;
  if (!order.data) return <main className="px-6 py-32 text-center lg:px-20" aria-busy="true"><div className="mx-auto h-4 w-32 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="mx-auto mt-6 h-12 max-w-sm animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></main>;
  const data = order.data;
  const due = data.amountDue ?? data.total;
  const paid = data.amountPaid ?? 0;
  const orderPath = data.id ?? data._id;
  if (isOrderPaymentFailed(data)) {
    return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.failure}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.failureBody}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={ROUTES.checkout} className={primaryLink}>{COPY.checkout.retry}</Link><Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div></main>;
  }
  if (!isOrderPaymentConfirmed(data)) {
    return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.pending}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{COPY.checkout.pendingBody}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{orderPath ? <Link href={ROUTES.checkoutPending + '?order=' + encodeURIComponent(orderPath)} className={primaryLink}>{COPY.common.retry}</Link> : null}<Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div></main>;
  }
  const message = data.paymentMode === 'cod'
    ? COPY.checkout.codConfirmed.replace('{amount}', formatPrice(due))
    : data.paymentMode === 'partial'
      ? COPY.checkout.partialConfirmed.replace('{paid}', formatPrice(paid)).replace('{due}', formatPrice(due))
      : COPY.checkout.onlineConfirmed;
  return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.success}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{message}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{orderPath ? <Link href={ROUTES.orders + '/' + orderPath} className={primaryLink}>{COPY.checkout.viewOrder}</Link> : null}<Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div></main>;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps): ReactNode { return <AccountGuard><SuccessContent orderId={orderId} /></AccountGuard>; }
