import Link from 'next/link';
import type { ReactNode } from 'react';
import { RETURN_EXCHANGE_COPY } from '@/constants/return-exchange';
import type { CustomerExchange } from '@/hooks/useReturns';

interface ExchangeRequestHistoryProps {
  requests: CustomerExchange[];
  showOrderLink?: boolean;
}

export function ExchangeRequestHistory({ requests, showOrderLink = false }: ExchangeRequestHistoryProps): ReactNode {
  if (!requests.length) return null;
  return <section className="mt-5 grid min-w-0 gap-3" aria-label={RETURN_EXCHANGE_COPY.exchangesHeading}>
    <h3 className="font-display text-xl">{RETURN_EXCHANGE_COPY.exchangesHeading}</h3>
    {requests.map((request) => <article key={request._id} className="min-w-0 border border-border bg-background-primary p-4">
      <div className="flex flex-wrap justify-between gap-2"><p className="break-all font-mono text-xs text-accent-gold">{request.requestNumber}</p><p className="text-xs uppercase tracking-[0.1em] text-text-secondary">{request.status.replaceAll('_', ' ')}</p></div>
      <p className="mt-2 text-sm text-text-primary">{request.originalItem ? `${request.originalItem.quantity} × ${request.originalItem.title}` : RETURN_EXCHANGE_COPY.exchangeRequest}</p>
      <p className="mt-2 break-all text-xs text-text-muted">{RETURN_EXCHANGE_COPY.replacement}: {request.requestedSku}</p>
      <p className="mt-2 text-xs text-text-muted">{request.updatedAt ? RETURN_EXCHANGE_COPY.updated : RETURN_EXCHANGE_COPY.submitted}: {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.updatedAt ?? request.createdAt))}</p>
      {showOrderLink ? <Link href={`/account/orders/${request.order}`} className="mt-3 inline-flex min-h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.1em]">{RETURN_EXCHANGE_COPY.originalOrder}</Link> : null}
    </article>)}
  </section>;
}
