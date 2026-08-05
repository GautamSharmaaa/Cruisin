// Governed by .rules v1.0
'use client';

import { Check, CreditCard, MapPin, PackageCheck, ReceiptText, Truck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';
import { SafeImage } from '@/components/shared/safe-image';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useOrder } from '@/hooks/useOrders';
import { humanizeOrderStatus } from '@/lib/order-cancellation';
import { trackConfirmedOrderPurchase } from '@/lib/meta-ecommerce';
import { isOrderPaymentConfirmed, isOrderPaymentFailed } from '@/lib/payment-status';
import { formatPrice } from '@/lib/utils';
import type { Address, Order } from '@/types/order.types';

export interface CheckoutSuccessProps { orderId?: string; }

const primaryLink = 'inline-flex min-h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]';
const secondaryLink = 'inline-flex min-h-11 min-w-11 items-center justify-center border border-border px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition duration-300 hover:border-border-strong hover:bg-background-elevated active:scale-[0.98]';

const PurchaseTracker = ({ order }: { order: Order }): null => {
  useEffect(() => { trackConfirmedOrderPurchase(order); }, [order]);
  return null;
};

const AddressBlock = ({ address }: { address?: Address }): ReactNode => address ? <address className="mt-4 not-italic text-sm leading-6 text-text-secondary">
  <p className="font-medium text-text-primary">{address.fullName}</p>
  <p>{address.line1}</p>
  {address.line2 ? <p>{address.line2}</p> : null}
  <p>{address.city}, {address.state} {address.postalCode}</p>
  <p>{address.country}</p>
  <p className="mt-2">{address.phone}</p>
</address> : <p className="mt-4 text-sm text-text-muted">{COPY.checkout.confirmation.addressUnavailable}</p>;

const Receipt = ({ order }: { order: Order }): ReactNode => {
  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = order.discount ?? 0;
  const shipping = order.shipping ?? 0;
  const tax = order.tax ?? 0;
  const codFee = order.codFee ?? 0;
  const paid = order.amountPaid ?? 0;
  const due = order.amountDue ?? Math.max(0, order.total - paid);
  const row = (label: string, amount: number, className = ''): ReactNode => <p className={`flex items-center justify-between gap-4 ${className}`}><span>{label}</span><span className="font-mono">{formatPrice(amount)}</span></p>;

  return <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="confirmation-summary-heading">
    <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="confirmation-summary-heading" className="font-display text-2xl text-text-primary">{COPY.checkout.confirmation.orderSummary}</h2></div>
    <div className="mt-5 grid gap-3 text-sm text-text-secondary">
      {row(COPY.checkout.confirmation.merchandise, subtotal)}
      {discount > 0 ? row(COPY.checkout.confirmation.discount, -discount, 'text-success') : null}
      {row(order.shippingMethod === 'express' ? COPY.checkout.confirmation.expressDelivery : COPY.checkout.confirmation.standardDelivery, shipping)}
      {tax > 0 ? row(COPY.checkout.confirmation.tax, tax) : null}
      {codFee > 0 ? row(COPY.checkout.confirmation.codFee, codFee) : null}
    </div>
    <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-text-secondary">
      {row(COPY.checkout.confirmation.total, order.total, 'text-base font-medium text-text-primary')}
      {paid > 0 ? row(COPY.checkout.confirmation.paid, paid) : null}
      {due > 0 ? row(COPY.checkout.confirmation.due, due, 'text-accent-gold') : null}
    </div>
  </section>;
};

const ConfirmationDetails = ({ order, message }: { order: Order; message: string }): ReactNode => {
  const orderPath = order.id ?? order._id;
  const due = order.amountDue ?? Math.max(0, order.total - (order.amountPaid ?? 0));
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const paymentLabel = order.paymentMode === 'cod'
    ? `${COPY.checkout.confirmation.cashOnDelivery} · ${formatPrice(due)} ${COPY.checkout.confirmation.due.toLowerCase()}`
    : order.paymentMode === 'partial'
      ? `${COPY.checkout.confirmation.partialPayment} · ${humanizeOrderStatus(order.paymentStatus)}`
      : `${COPY.checkout.confirmation.onlinePayment} · ${humanizeOrderStatus(order.paymentStatus)}`;

  return <main className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-36">
    <PurchaseTracker order={order} />
    <section className="relative overflow-hidden border border-accent-gold/40 bg-background-elevated p-6 shadow-lg sm:p-8 lg:p-10" aria-labelledby="order-confirmed-heading">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-gold/10 blur-3xl" aria-hidden="true" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:gap-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-success/50 bg-success/10 text-success sm:h-14 sm:w-14" aria-hidden="true"><Check className="h-6 w-6" strokeWidth={1.8} /></span>
          <div className="min-w-0"><p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">{COPY.checkout.confirmation.eyebrow}</p><h1 id="order-confirmed-heading" className="mt-2 font-display text-4xl text-text-primary sm:text-5xl lg:text-6xl">{COPY.checkout.success}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">{message}</p><p className="mt-3 break-all font-mono text-xs tracking-[0.08em] text-text-muted">{order.orderNumber ?? orderPath ?? COPY.checkout.pendingOrder}</p></div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">{orderPath ? <Link href={`${ROUTES.orders}/${orderPath}`} className={primaryLink}>{COPY.checkout.viewOrder}</Link> : null}<Link href={ROUTES.orders} className={secondaryLink}>{COPY.checkout.myOrders}</Link></div>
      </div>
      <dl className="relative mt-8 grid border border-border-subtle bg-background-primary/70 sm:grid-cols-3">
        <div className="border-b border-border-subtle p-4 sm:border-b-0 sm:border-r"><dt className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{COPY.checkout.confirmation.items}</dt><dd className="mt-2 text-sm text-text-primary">{itemCount}</dd></div>
        <div className="border-b border-border-subtle p-4 sm:border-b-0 sm:border-r"><dt className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{COPY.checkout.confirmation.delivery}</dt><dd className="mt-2 text-sm text-text-primary">{humanizeOrderStatus(order.shippingMethod ?? 'standard')} delivery</dd></div>
        <div className="p-4"><dt className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{COPY.checkout.confirmation.payment}</dt><dd className="mt-2 text-sm text-text-primary">{paymentLabel}</dd></div>
      </dl>
    </section>

    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="confirmation-items-heading">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><PackageCheck className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="confirmation-items-heading" className="font-display text-2xl text-text-primary">{COPY.checkout.confirmation.purchasedItems}</h2></div><span className="text-xs text-text-muted">{itemCount} {COPY.checkout.confirmation.items.toLowerCase()}</span></div>
          <div className="mt-5 grid gap-3">{order.items.map((item, index) => <article key={`${item.sku}-${item.variant ?? item.variantId ?? item.title}`} className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-4 border border-border-subtle bg-background-primary p-3 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
            <div className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><SafeImage src={item.image || '/cruisin-image-fallback.svg'} alt={`${item.title}${item.color ? ` — ${item.color}` : ''}`} fill sizes="88px" className="object-cover" priority={index === 0} /></div>
            <div className="min-w-0"><h3 className="break-words font-display text-lg text-text-primary sm:text-xl">{item.title}</h3><p className="mt-1 text-sm text-text-secondary">{[item.size, item.color].filter(Boolean).join(' / ') || COPY.checkout.confirmation.originalVariant}</p><p className="mt-2 break-all font-mono text-[10px] text-text-muted">{item.sku}</p><p className="mt-2 text-xs text-text-secondary sm:hidden">{COPY.checkout.confirmation.quantity} {item.quantity} · {formatPrice(item.price)} each</p></div>
            <div className="hidden text-right sm:block"><p className="text-xs text-text-muted">{COPY.checkout.confirmation.quantity} {item.quantity}</p><p className="mt-1 font-mono text-sm text-accent-gold">{formatPrice(item.price * item.quantity)}</p></div>
          </article>)}</div>
        </section>

        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="confirmation-next-heading">
          <div className="flex items-center gap-3"><Truck className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="confirmation-next-heading" className="font-display text-2xl text-text-primary">{COPY.checkout.confirmation.next}</h2></div>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            {[[COPY.checkout.confirmation.orderRecorded, COPY.checkout.confirmation.orderRecordedBody], [COPY.checkout.confirmation.preparation, COPY.checkout.confirmation.preparationBody], [COPY.checkout.confirmation.tracking, COPY.checkout.confirmation.trackingBody]].map(([title, body], index) => <li key={title} className="grid grid-cols-[32px_1fr] gap-3 sm:block"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-gold/50 font-mono text-xs text-accent-gold">{index + 1}</span><div className="sm:mt-4"><p className="text-sm font-medium text-text-primary">{title}</p><p className="mt-1 text-xs leading-5 text-text-secondary">{body}</p></div></li>)}
          </ol>
        </section>
      </div>

      <aside className="grid gap-6 lg:sticky lg:top-28">
        <Receipt order={order} />
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="confirmation-address-heading"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="confirmation-address-heading" className="font-display text-2xl text-text-primary">{COPY.checkout.confirmation.deliveryAddress}</h2></div><AddressBlock address={order.shippingAddress} /></section>
        <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-label={COPY.checkout.confirmation.payment}><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-accent-gold" aria-hidden="true" /><p className="font-display text-2xl text-text-primary">{COPY.checkout.confirmation.payment}</p></div><p className="mt-4 text-sm leading-6 text-text-secondary">{message}</p></section>
      </aside>
    </div>
  </main>;
};

function SuccessContent({ orderId }: CheckoutSuccessProps): ReactNode {
  const order = useOrder(orderId);
  if (!orderId || order.isError) return <main className="px-6 py-32 text-center lg:px-20"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Order status</p><h1 className="mt-4 font-display text-5xl">We couldn’t find that order</h1><p className="mx-auto mt-4 max-w-xl text-text-secondary">Open your orders to view purchases associated with your account.</p><div className="mt-8"><Link href={ROUTES.orders} className={primaryLink}>My orders</Link></div></main>;
  if (!order.data) return <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-36" aria-busy="true" aria-label="Loading order confirmation"><div className="h-72 animate-shimmer border border-border bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="h-72 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="h-72 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></div></main>;
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
  return <ConfirmationDetails order={data} message={message} />;
}

export function CheckoutSuccess({ orderId }: CheckoutSuccessProps): ReactNode { return <AccountGuard><SuccessContent orderId={orderId} /></AccountGuard>; }
