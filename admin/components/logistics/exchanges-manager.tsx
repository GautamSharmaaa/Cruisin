// Governed by .rules v1.0
'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAdminExchanges } from '@/hooks/useLogistics';
import { groupExchangeRequestsByOrder } from '@/lib/exchange-orders';

export function ExchangesManager(): ReactNode {
  const requests = useAdminExchanges();
  const groups = groupExchangeRequestsByOrder(requests.data ?? []);

  return <div className="grid gap-5">
    {groups.map((group) => {
      const awaitingApproval = group.requests.filter((request) => request.status === 'requested');
      const approvedForPickup = group.requests.filter((request) => request.status === 'inventory_reserved' && !request.reverseShipment);
      const pickupStarted = group.requests.filter((request) => ['reverse_pickup', 'in_transit', 'warehouse_received'].includes(request.status)).length;
      return <article key={group.orderId} className="grid gap-5 border border-border bg-background-elevated p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="font-mono text-xs text-accent-gold">EXCHANGE ORDER</p>
            <h2 className="mt-2 font-display text-2xl">{group.orderNumber}</h2>
            <p className="mt-2 text-sm text-text-secondary">{group.requests.length} product{group.requests.length === 1 ? '' : 's'} · {awaitingApproval.length} awaiting decision · {approvedForPickup.length} approved for pickup{pickupStarted ? ` · ${pickupStarted} in pickup workflow` : ''}</p>
          </div>
          <Link href={`/exchanges/${group.orderId}`} className="inline-flex h-11 items-center justify-center border border-accent-gold px-6 text-xs font-medium uppercase tracking-[0.08em] text-accent-gold transition hover:bg-accent-gold hover:text-text-inverse">Review order</Link>
      </article>;
    })}
    {!requests.isLoading && !requests.data?.length ? <p className="border border-border p-8 text-center text-text-muted">No exchange requests.</p> : null}
  </div>;
}
