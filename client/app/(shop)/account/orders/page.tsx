// Governed by .rules v1.0
'use client';

import { CalendarDays, ChevronRight, MapPin, Package, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { OrderCancellationDialog } from '@/components/account/order-cancellation-dialog';
import { SafeImage } from '@/components/shared/safe-image';
import { useOrders } from '@/hooks/useOrders';
import { canCustomerCancel, humanizeOrderStatus, orderId, orderStatus } from '@/lib/order-cancellation';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types/order.types';

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const statusClasses = (status: string): string => {
  if (status === 'cancelled' || status === 'returned' || status === 'payment_failed') return 'border-danger/50 bg-danger/10 text-text-primary';
  if (status === 'delivered') return 'border-success/50 bg-success/10 text-text-primary';
  if (status === 'shipped' || status === 'processing') return 'border-info/60 bg-info/10 text-text-primary';
  return 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold';
};

const OrderCard = ({ order }: { order: Order }): ReactNode => {
  const id = orderId(order);
  const status = orderStatus(order);
  const displayStatus = order.paymentStatus === 'failed' ? 'payment_failed' : status;
  const firstItem = order.items[0];
  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const address = order.shippingAddress;

  return <article className="border border-border bg-background-elevated shadow-sm transition duration-300 hover:border-border-strong hover:shadow-md">
    <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <p className="font-mono text-sm text-text-primary">{order.orderNumber ?? id}</p>
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(order.createdAt)}</span>
        <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
      </div>
      <span className={`w-fit border px-3 py-1 text-xs uppercase tracking-[0.12em] ${statusClasses(displayStatus)}`}>{humanizeOrderStatus(displayStatus)}</span>
    </div>

    <div className="grid gap-5 p-4 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
      <div className="relative aspect-[3/4] w-24 overflow-hidden bg-background-primary sm:w-[104px]">
        <SafeImage src={firstItem?.image || '/cruisin-image-fallback.svg'} alt={firstItem?.title ?? 'Cruisin order'} fill sizes="104px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl text-text-primary">{firstItem?.title ?? 'Cruisin order'}</h2>
        {firstItem ? <p className="mt-1 text-sm text-text-secondary">{[firstItem.size, firstItem.color].filter(Boolean).join(' / ') || firstItem.sku} · Qty {firstItem.quantity}</p> : null}
        {order.items.length > 1 ? <p className="mt-1 text-xs text-text-muted">Plus {order.items.length - 1} more {order.items.length - 1 === 1 ? 'product' : 'products'}</p> : null}
        {address ? <p className="mt-4 inline-flex items-start gap-2 text-sm text-text-secondary"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" /><span>Delivering to {address.city}, {address.state} {address.postalCode}</span></p> : null}
        {order.cancellation ? <div className="mt-4 border-l-2 border-danger pl-3 text-sm text-text-secondary"><p className="text-text-primary">Cancelled: {order.cancellation.reason}</p>{order.cancellation.details ? <p className="mt-1">{order.cancellation.details}</p> : null}<p className="mt-1 text-xs uppercase tracking-[0.1em]">Refund: {humanizeOrderStatus(order.cancellation.refundStatus)}</p></div> : null}
      </div>
      <div className="flex min-w-44 flex-col gap-3 border-t border-border pt-4 sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="sm:text-right"><p className="text-xs uppercase tracking-[0.14em] text-text-muted">Order total</p><p className="mt-1 font-mono text-xl text-accent-gold">{formatPrice(order.total)}</p><p className="mt-1 text-xs text-text-muted">{humanizeOrderStatus(order.paymentStatus)}</p></div>
        <Link href={`/account/orders/${id}`} className="inline-flex min-h-10 items-center justify-center gap-2 bg-accent-gold px-4 text-xs font-medium uppercase tracking-[0.12em] text-text-inverse transition hover:brightness-110">View details <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        {canCustomerCancel(order) ? <OrderCancellationDialog order={order} compact /> : null}
      </div>
    </div>
  </article>;
};

export default function OrdersPage(): ReactNode {
  const orders = useOrders();

  return <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-36">
    <header className="border-b border-border pb-8">
      <p className="font-accent text-xs uppercase tracking-[0.22em] text-accent-gold">Your purchases</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-display text-4xl text-text-primary sm:text-5xl">Orders</h1><p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">Track deliveries, review payment details, and manage eligible cancellations.</p></div>
        {orders.data?.length ? <p className="font-mono text-xs uppercase tracking-[0.12em] text-text-muted">{orders.data.length} total {orders.data.length === 1 ? 'order' : 'orders'}</p> : null}
      </div>
    </header>

    {orders.isLoading ? <div className="mt-8 grid gap-5" aria-busy="true" aria-label="Loading orders">{[0, 1].map((item) => <div key={item} className="h-64 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" />)}</div> : null}

    {orders.isError ? <section className="mt-8 border border-danger/50 bg-danger/10 p-8 text-center"><ReceiptText className="mx-auto h-8 w-8 text-text-secondary" aria-hidden="true" /><h2 className="mt-4 font-display text-2xl">We couldn’t load your orders</h2><p className="mt-2 text-sm text-text-secondary">{orders.error instanceof Error ? orders.error.message : 'Please refresh and try again.'}</p><button type="button" onClick={() => void orders.refetch()} className="mt-5 min-h-11 bg-accent-gold px-5 text-xs uppercase tracking-[0.12em] text-text-inverse">Try again</button></section> : null}

    {orders.data?.length === 0 ? <section className="mt-8 border border-border bg-background-elevated px-6 py-16 text-center"><Package className="mx-auto h-10 w-10 text-accent-gold" aria-hidden="true" /><h2 className="mt-5 font-display text-3xl">No orders yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">Your confirmed purchases will appear here with delivery and payment updates.</p><Link href="/shop" className="mt-6 inline-flex min-h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.12em] text-text-inverse">Explore the shop</Link></section> : null}

    {orders.data?.length ? <section className="mt-8 grid gap-5" aria-label="Order history">{orders.data.map((order) => <OrderCard key={orderId(order)} order={order} />)}</section> : null}
  </main>;
}
