// Governed by .rules v1.0
'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/utils';
export default function AccountPage(): ReactNode { const params = useParams<{ id: string }>(); const order = useOrder(params.id); return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.orders}</h1>{order.data ? <section className="mt-8 grid gap-4 border border-border p-6"><p className="font-mono text-accent-gold">{order.data.id ?? order.data._id}</p><p className="text-text-secondary">{order.data.orderStatus ?? order.data.status}</p><p className="font-mono text-xl">{formatPrice(order.data.total)}</p>{order.data.timeline.map((event) => <div key={event.timestamp} className="border-t border-border pt-3 text-sm text-text-secondary">{event.status} · {event.note}</div>)}</section> : null}</main>; }
