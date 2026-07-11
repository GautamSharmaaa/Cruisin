// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/utils';

export interface CheckoutSuccessProps { orderId?: string; }

function SuccessContent({ orderId }: CheckoutSuccessProps): ReactNode {
  const order = useOrder(orderId);
  if (!orderId || order.isError) return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Order status</p><h1 className="mt-4 font-display text-5xl">We couldn’t find that order</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">Open your orders to view purchases associated with your account.</p><div className="mt-8"><Button><Link href={ROUTES.orders}>My orders</Link></Button></div></main>;
  if (!order.data) return <main className="px-6 py-32 text-center lg:px-20" aria-busy="true"><div className="mx-auto h-4 w-32 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="mx-auto mt-6 h-12 max-w-sm animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></main>;
  const data = order.data;
  const due = data.amountDue ?? data.total;
  const paid = data.amountPaid ?? 0;
  const message = data.paymentMode === 'cod' ? `Order placed — ${formatPrice(due)} is due on delivery.` : data.paymentMode === 'partial' ? `Advance payment of ${formatPrice(paid)} received; ${formatPrice(due)} remains due.` : data.paymentStatus === 'pending' ? 'Payment received. We are confirming its final status.' : 'Payment confirmed.';
  const orderPath = data.id ?? data._id;
  return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{data.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p><h1 className="mt-4 font-display text-5xl">{COPY.checkout.success}</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">{message}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{orderPath ? <Button><Link href={ROUTES.orders + '/' + orderPath}>View order details</Link></Button> : null}<Button variant="secondary"><Link href={ROUTES.orders}>My orders</Link></Button></div></main>;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps): ReactNode { return <AccountGuard><SuccessContent orderId={orderId} /></AccountGuard>; }
