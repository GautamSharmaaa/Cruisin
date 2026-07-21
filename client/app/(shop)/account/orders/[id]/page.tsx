// Governed by .rules v1.0
'use client';

import { ArrowLeft, CalendarDays, CreditCard, MapPin, PackageCheck, ReceiptText, RotateCcw, Truck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { OrderCancellationDialog } from '@/components/account/order-cancellation-dialog';
import { SafeImage } from '@/components/shared/safe-image';
import { ROUTES } from '@/constants/routes';
import { useOrder } from '@/hooks/useOrders';
import { canCustomerCancel, humanizeOrderStatus, orderId, orderStatus } from '@/lib/order-cancellation';
import { formatPrice } from '@/lib/utils';
import type { Address, Order } from '@/types/order.types';

const formatDate = (value: string | undefined, includeTime = false): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', includeTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const AddressBlock = ({ address }: { address?: Address }): ReactNode => address ? <address className="mt-4 not-italic text-sm leading-6 text-text-secondary">
  <p className="font-medium text-text-primary">{address.fullName}</p>
  <p>{address.line1}</p>
  {address.line2 ? <p>{address.line2}</p> : null}
  <p>{address.city}, {address.state} {address.postalCode}</p>
  <p>{address.country}</p>
  <p className="mt-2">{address.phone}</p>
</address> : <p className="mt-4 text-sm text-text-muted">Address is unavailable for this legacy order.</p>;

const DetailSkeleton = (): ReactNode => <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading order details"><div className="h-96 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="h-96 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></div>;

const BillBreakdown = ({ order }: { order: Order }): ReactNode => {
  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = order.discount ?? 0;
  const shipping = order.shipping ?? 0;
  const tax = order.tax ?? 0;
  const codFee = order.codFee ?? 0;
  const paid = order.amountPaid ?? 0;
  const refunded = order.refundAmount ?? 0;
  const due = order.orderStatus === 'cancelled' ? 0 : order.amountDue ?? Math.max(0, order.total - paid);
  const row = (label: string, amount: number, className = ''): ReactNode => <p className={`flex items-center justify-between gap-4 ${className}`}><span>{label}</span><span className="font-mono">{formatPrice(amount)}</span></p>;

  return <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="bill-heading">
    <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="bill-heading" className="font-display text-2xl">Bill breakdown</h2></div>
    <div className="mt-5 grid gap-3 text-sm text-text-secondary">
      {row('Merchandise subtotal', subtotal)}
      {discount > 0 ? row(order.couponCode ? `Discount (${order.couponCode})` : 'Discount', -discount, 'text-success') : null}
      {row(order.shippingMethod === 'express' ? 'Express delivery' : 'Standard delivery', shipping)}
      {tax > 0 ? row('Tax', tax) : null}
      {codFee > 0 ? row('Cash on delivery fee', codFee) : null}
    </div>
    <div className="mt-5 border-t border-border pt-5">
      {row('Order total', order.total, 'text-base font-medium text-text-primary')}
      <div className="mt-4 grid gap-2 text-sm text-text-secondary">{row('Paid', paid)}{refunded > 0 ? row('Refunded', refunded, 'text-success') : null}{due > 0 ? row('Balance due', due, 'text-accent-gold') : null}</div>
    </div>
    {order.paymentMode === 'partial' && due > 0 ? <p className="mt-5 border-l-2 border-accent-gold pl-3 text-xs leading-5 text-text-secondary">Advance received. The remaining balance is due when your order arrives.</p> : null}
    {order.paymentMode === 'cod' && due > 0 ? <p className="mt-5 border-l-2 border-accent-gold pl-3 text-xs leading-5 text-text-secondary">No online charge was made. Payment is due on delivery.</p> : null}
  </section>;
};

const OrderDetails = ({ order }: { order: Order }): ReactNode => {
  const id = orderId(order);
  const status = orderStatus(order);

  return <>
    <header className="border-b border-border pb-8">
      <Link href={ROUTES.orders} className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-secondary transition hover:text-text-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All orders</Link>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">Order details</p><h1 className="mt-2 break-all font-display text-3xl text-text-primary sm:text-5xl">{order.orderNumber ?? id}</h1><p className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary"><CalendarDays className="h-4 w-4" aria-hidden="true" />Placed {formatDate(order.createdAt)}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 text-xs uppercase tracking-[0.12em] text-accent-gold">{humanizeOrderStatus(status)}</span>{canCustomerCancel(order) ? <OrderCancellationDialog order={order} /> : null}</div>
      </div>
    </header>

    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="ordered-items-heading">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><PackageCheck className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="ordered-items-heading" className="font-display text-2xl text-text-primary">Items in your order</h2></div><span className="text-xs text-text-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)} total</span></div>
          <div className="mt-5 grid gap-3">{order.items.map((item) => <article key={`${item.sku}-${item.variant ?? item.variantId ?? item.title}`} className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 border border-border-subtle bg-background-primary p-3 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center">
            <div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={item.image || '/cruisin-image-fallback.svg'} alt={`${item.title}${item.color ? ` — ${item.color}` : ''}`} fill sizes="104px" className="object-cover" /></div>
            <div className="min-w-0"><h3 className="break-words font-display text-xl text-text-primary">{item.title}</h3><p className="mt-1 text-sm text-text-secondary">{[item.size, item.color].filter(Boolean).join(' / ') || 'Original selected variant'}</p><p className="mt-2 break-all font-mono text-xs text-text-muted">{item.sku}</p><p className="mt-2 text-xs text-text-secondary sm:hidden">Qty {item.quantity} · {formatPrice(item.price)} each</p></div>
            <div className="hidden text-right sm:block"><p className="text-xs text-text-muted">Qty {item.quantity}</p><p className="mt-1 font-mono text-sm text-accent-gold">{formatPrice(item.price * item.quantity)}</p><p className="mt-1 text-xs text-text-muted">{formatPrice(item.price)} each</p></div>
          </article>)}</div>
        </section>

        {order.cancellation ? <section className="border border-danger/50 bg-danger/10 p-5 sm:p-6" aria-labelledby="cancellation-heading">
          <div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-text-primary" aria-hidden="true" /><h2 id="cancellation-heading" className="font-display text-2xl">Cancellation & refund</h2></div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-[0.12em] text-text-muted">Reason</dt><dd className="mt-1 text-text-primary">{order.cancellation.reason}</dd></div><div><dt className="text-xs uppercase tracking-[0.12em] text-text-muted">Cancelled</dt><dd className="mt-1 text-text-primary">{formatDate(order.cancellation.cancelledAt, true)}</dd></div>{order.cancellation.details ? <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-[0.12em] text-text-muted">Details</dt><dd className="mt-1 leading-6 text-text-secondary">{order.cancellation.details}</dd></div> : null}<div><dt className="text-xs uppercase tracking-[0.12em] text-text-muted">Refund status</dt><dd className="mt-1 text-text-primary">{humanizeOrderStatus(order.cancellation.refundStatus)}</dd></div><div><dt className="text-xs uppercase tracking-[0.12em] text-text-muted">Refund processed</dt><dd className="mt-1 text-text-primary">{formatPrice(order.cancellation.refundAmount ?? 0)}</dd></div></dl>
          {order.cancellation.refundStatus === 'required' ? <p className="mt-5 border-l-2 border-warning pl-3 text-sm leading-6 text-text-secondary">Your cancellation is recorded. The Cruisin team must now review and issue the eligible Razorpay refund.</p> : null}
          {order.cancellation.refundStatus === 'pending' ? <p className="mt-5 border-l-2 border-warning pl-3 text-sm leading-6 text-text-secondary">Your refund has been sent to Razorpay and is being processed. Bank settlement time may vary.</p> : null}
          {order.cancellation.refundStatus === 'partially_refunded' ? <p className="mt-5 border-l-2 border-warning pl-3 text-sm leading-6 text-text-secondary">Razorpay has processed {formatPrice(order.cancellation.refundAmount ?? 0)} so far. The remaining eligible paid balance is still under review.</p> : null}
          {order.cancellation.refundStatus === 'refunded' ? <p className="mt-5 border-l-2 border-success pl-3 text-sm leading-6 text-text-secondary">Razorpay has processed your {formatPrice(order.cancellation.refundAmount ?? 0)} refund. Your bank may need additional time to display the credit.</p> : null}
          {order.cancellation.refundStatus === 'failed' ? <p role="alert" className="mt-5 border-l-2 border-danger pl-3 text-sm leading-6 text-text-secondary">Razorpay could not complete this refund. The Cruisin team can retry or resolve it from the admin dashboard.</p> : null}
          {order.cancellation.refundStatus === 'not_required' ? <p className="mt-5 border-l-2 border-border pl-3 text-sm leading-6 text-text-secondary">No online payment was collected for this order, so no refund is required.</p> : null}
        </section> : null}

        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="font-display text-2xl">Order timeline</h2>
          {order.timeline.length ? <ol className="mt-5">{[...order.timeline].reverse().map((event, index) => <li key={`${event.timestamp}-${event.status}-${index}`} className="relative grid grid-cols-[16px_1fr] gap-4 pb-6 last:pb-0"><span className="relative mt-1.5 h-2.5 w-2.5 rounded-full border border-accent-gold bg-background-elevated before:absolute before:left-[4px] before:top-3 before:h-[calc(100%+32px)] before:w-px before:bg-border last:before:hidden" aria-hidden="true" /><div><p className="text-sm font-medium text-text-primary">{humanizeOrderStatus(event.status)}</p><p className="mt-1 text-sm leading-6 text-text-secondary">{event.note || 'Order status updated'}</p><time className="mt-1 block text-xs text-text-muted">{formatDate(event.timestamp, true)}</time></div></li>)}</ol> : <p className="mt-4 text-sm text-text-muted">No timeline updates are available.</p>}
        </section>
      </div>

      <aside className="grid gap-6 lg:sticky lg:top-28">
        <BillBreakdown order={order} />
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="delivery-heading"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="delivery-heading" className="font-display text-2xl">Delivery address</h2></div><AddressBlock address={order.shippingAddress} /></section>
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="shipping-heading"><div className="flex items-center gap-3"><Truck className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="shipping-heading" className="font-display text-2xl">Delivery</h2></div><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-text-muted">Method</dt><dd className="text-right text-text-primary">{humanizeOrderStatus(order.shippingMethod ?? 'standard')} delivery</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Tracking</dt><dd className="break-all text-right font-mono text-xs text-text-primary">{order.trackingNumber || 'Added after dispatch'}</dd></div></dl></section>
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="payment-heading"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="payment-heading" className="font-display text-2xl">Payment</h2></div><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-text-muted">Mode</dt><dd className="text-right text-text-primary">{humanizeOrderStatus(order.paymentMode ?? order.paymentMethod ?? 'online')}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Status</dt><dd className="text-right text-text-primary">{humanizeOrderStatus(order.paymentStatus)}</dd></div></dl>{order.refunds?.length ? <div className="mt-5 border-t border-border pt-5"><p className="text-xs uppercase tracking-[0.12em] text-text-muted">Refund history</p><div className="mt-3 grid gap-3">{order.refunds.map((refund, index) => <div key={refund.providerRefundId ?? `${refund.amount}-${refund.createdAt}-${index}`} className="border-l-2 border-accent-gold pl-3 text-sm"><p className="text-text-primary">{formatPrice(refund.amount)} · {humanizeOrderStatus(refund.status)}</p>{refund.reason ? <p className="mt-1 leading-5 text-text-secondary">{refund.reason}</p> : null}{refund.createdAt ? <p className="mt-1 text-xs text-text-muted">{formatDate(refund.createdAt, true)}</p> : null}</div>)}</div></div> : null}</section>
      </aside>
    </div>
  </>;
};

export default function OrderDetailPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const order = useOrder(params.id);

  return <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-36">
    {order.isError ? <section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private order</p><h1 className="mt-4 font-display text-4xl text-text-primary">We couldn’t load this order</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-secondary">{order.error instanceof Error ? order.error.message : 'Order details are only available to the customer who placed the order.'}</p><Link href={ROUTES.orders} className="mt-8 inline-flex min-h-11 items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition hover:brightness-110">My orders</Link></section> : null}
    {order.isLoading ? <DetailSkeleton /> : null}
    {order.data ? <OrderDetails order={order.data} /> : null}
  </main>;
}
