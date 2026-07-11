// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/utils';
export default function AccountPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const order = useOrder(params.id);
  if (order.isError) return <main className="px-6 py-32 lg:px-20"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private order</p><h1 className="mt-4 font-display text-4xl text-text-primary">You’re not authorised to view this order</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-secondary">Order details are only available to the customer who placed the order.</p><Button className="mt-8"><Link href={ROUTES.orders}>My orders</Link></Button></section></main>;
  return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.orders}</h1>{order.data ? <section className="mt-8 grid gap-4 border border-border p-6"><p className="font-mono text-accent-gold">{order.data.orderNumber ?? order.data.id ?? order.data._id}</p><p className="text-text-secondary">{order.data.orderStatus ?? order.data.status} · {order.data.paymentStatus}</p><div className="grid gap-2 border-y border-border py-4 text-sm text-text-secondary"><p className="flex justify-between"><span>Total</span><span>{formatPrice(order.data.total)}</span></p><p className="flex justify-between"><span>Paid</span><span>{formatPrice(order.data.amountPaid ?? 0)}</span></p><p className="flex justify-between"><span>Due</span><span>{formatPrice(order.data.amountDue ?? order.data.total)}</span></p>{order.data.paymentMode === 'partial' ? <p className="text-accent-gold">Advance received. The remaining balance is due on delivery.</p> : null}{order.data.paymentMode === 'cod' ? <p className="text-accent-gold">Order placed — payment is due on delivery.</p> : null}</div>{order.data.timeline.map((event) => <div key={event.timestamp} className="border-t border-border pt-3 text-sm text-text-secondary">{event.status} · {event.note}</div>)}</section> : order.isLoading ? <div className="mt-8 h-48 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" aria-busy="true" /> : null}</main>;
}
