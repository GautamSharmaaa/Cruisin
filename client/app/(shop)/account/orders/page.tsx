// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/utils';
export default function AccountPage(): ReactNode { const orders = useOrders(); return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.orders}</h1><div className="mt-8 grid gap-3">{orders.data?.map((order) => <Link key={order.id ?? order._id} href={'/account/orders/' + (order.id ?? order._id)} className="grid min-h-16 grid-cols-3 items-center border border-border p-4"><span>{order.orderNumber ?? order.id ?? order._id}</span><span>{order.orderStatus ?? order.status}</span><span className="text-right font-mono text-accent-gold">{formatPrice(order.total)}</span></Link>)}</div></main>; }
