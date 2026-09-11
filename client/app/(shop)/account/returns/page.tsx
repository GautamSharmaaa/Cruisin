'use client';

// Governed by .rules v1.0
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMyReturns } from '@/hooks/useReturns';
import { RefundDestinationPanel, ReturnRefundProgress } from '@/components/account/refund-destination-panel';
import { formatPrice } from '@/lib/utils';

const date = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';

export default function ReturnsPage(): ReactNode {
  const returns = useMyReturns();
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><section className="mx-auto max-w-[1200px]">
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">Post-purchase care</p><h1 className="mt-4 font-display text-4xl">My returns</h1><p className="mt-3 text-sm text-text-secondary">Payment, review, pickup, and refund progress for your return requests.</p></div><Link href="/account/wallet" className="inline-flex min-h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em]">Cruisin Wallet</Link></header>
    {returns.isLoading ? <p className="mt-8 text-sm text-text-secondary">Loading returns…</p> : null}
    {returns.error ? <p role="alert" className="mt-8 text-sm text-danger">{returns.error.message}</p> : null}
    {returns.data?.length ? <div className="mt-8 grid gap-5">{returns.data.map((request) => <article key={request._id} className="border border-border bg-background-elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p><h2 className="mt-2 font-display text-2xl">{request.status.replaceAll('_', ' ')}</h2></div><Link href={`/account/orders/${request.order}`} className="inline-flex min-h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.1em]">Original order</Link></div>
      <ul className="mt-5 grid gap-2 border-y border-border py-4 text-sm">{request.items.map((item) => <li key={`${item.sku}-${item.variant}`} className="flex flex-wrap justify-between gap-3"><span>{item.quantity} × {item.title}<span className="ml-2 text-text-muted">{[item.size, item.color].filter(Boolean).join(' / ')}</span></span><span className="font-mono text-xs text-text-muted">{item.sku}</span></li>)}</ul>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-text-muted">Issue</dt><dd className="mt-1 text-text-primary">{request.reason.replaceAll('_', ' ')}</dd></div><div><dt className="text-text-muted">Handling fee</dt><dd className="mt-1 text-text-primary">{formatPrice(request.handlingFee)} · {request.handlingFeePaymentStatus}</dd></div><div><dt className="text-text-muted">Pickup</dt><dd className="mt-1 text-text-primary">{request.pickupStatus ?? 'Not scheduled'}</dd></div><div><dt className="text-text-muted">Product refund</dt><dd className="mt-1 text-text-primary">{request.productRefundAmount ? `${formatPrice(request.productRefundAmount)} · ` : ''}{request.refundStatus.replaceAll('_', ' ')}</dd></div><div><dt className="text-text-muted">Submitted</dt><dd className="mt-1 text-text-primary">{date(request.createdAt)}</dd></div><div><dt className="text-text-muted">Latest update</dt><dd className="mt-1 text-text-primary">{date(request.latestUpdate ?? request.updatedAt)}</dd></div></dl>
      <ReturnRefundProgress request={request} />
      <RefundDestinationPanel request={request} />
      {request.evidence?.length ? <div className="mt-5 flex flex-wrap gap-2" aria-label="Submitted issue photos">{request.evidence.map((photo, index) => <img key={photo.url} src={photo.url} alt={`Submitted issue photo ${index + 1}`} className="h-20 w-20 border border-border object-cover" />)}</div> : null}
      {request.details ? <p className="mt-5 border-l-2 border-accent-gold pl-3 text-sm leading-6 text-text-secondary">{request.details}</p> : null}
    </article>)}</div> : null}
    {!returns.isLoading && returns.data?.length === 0 ? <div className="mt-8 border border-border bg-background-elevated p-10 text-center"><RotateCcw className="mx-auto text-accent-gold" /><h2 className="mt-4 font-display text-2xl">No return requests</h2><p className="mt-2 text-sm text-text-secondary">Eligible delivered orders will show a Return items option in order details.</p><Link href="/account/orders" className="mt-6 inline-flex min-h-11 items-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse">View orders</Link></div> : null}
  </section></main>;
}
