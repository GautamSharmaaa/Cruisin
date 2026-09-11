// Governed by .rules v1.0
'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { useAdminMe } from '@/hooks/useAdminResources';
import { useAdminExchanges, useWorkflowAction } from '@/hooks/useLogistics';
import { exchangeOrderLine, groupExchangeRequestsByOrder } from '@/lib/exchange-orders';

const followUpActions: Record<string, string[]> = {
  reverse_pickup: ['warehouse_received'],
  warehouse_received: ['quality_check_passed', 'quality_check_failed'],
  replacement_pending: ['replacement_shipped'],
  replacement_shipped: ['complete'],
  completed: ['close'],
  rejected: ['close'],
  quality_check_failed: ['close']
};

const statusLabel = (status: string): string => {
  if (status === 'inventory_reserved') return 'Approved · inventory reserved';
  if (status === 'requested') return 'Awaiting admin decision';
  if (status === 'payment_pending') return 'Customer payment pending';
  return status.replaceAll('_', ' ');
};

export interface ExchangeOrderReviewProps {
  orderId: string;
}

export function ExchangeOrderReview({ orderId }: ExchangeOrderReviewProps): ReactNode {
  const exchanges = useAdminExchanges();
  const action = useWorkflowAction('exchanges');
  const me = useAdminMe();
  const group = groupExchangeRequestsByOrder(exchanges.data ?? []).find((candidate) => candidate.orderId === orderId);
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';

  if (exchanges.isLoading) return <div className="h-48 animate-pulse border border-border bg-background-elevated" />;
  if (exchanges.error) return <p className="border border-danger p-6 text-danger">{exchanges.error.message}</p>;
  if (!group) return <section className="grid gap-5">
    <PageHeader eyebrow="Post-purchase care" title="Exchange order not found" subtitle="This order has no exchange requests, or it is outside the current operations list." />
    <Link href="/exchanges" className="text-sm text-accent-gold">← Back to exchange orders</Link>
  </section>;

  const awaitingApproval = group.requests.filter((request) => request.status === 'requested');
  const approvedForPickup = group.requests.filter((request) => request.status === 'inventory_reserved' && !request.reverseShipment);
  const canCreatePickup = canMutateShiprocket && awaitingApproval.length === 0 && approvedForPickup.length > 0;
  const order = group.requests[0]?.order;
  const shippingAddress = order?.shippingAddress;

  return <section className="grid gap-6">
    <PageHeader
      eyebrow="Exchange order review"
      title={group.orderNumber}
      subtitle="Review every product and approve or reject it individually. After all decisions are complete, create one reverse pickup for the approved products."
      action={<Link href="/exchanges" className="inline-flex h-11 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.08em] text-text-secondary hover:border-border-strong hover:text-text-primary">← Exchange orders</Link>}
    />

    <div className="grid gap-3 border border-border bg-background-elevated p-5 md:grid-cols-3">
      <div><p className="text-xs uppercase tracking-[0.12em] text-text-muted">Products</p><p className="mt-2 text-lg text-text-primary">{group.requests.length}</p></div>
      <div><p className="text-xs uppercase tracking-[0.12em] text-text-muted">Customer</p><p className="mt-2 text-sm text-text-primary">{shippingAddress?.fullName ?? 'Customer'}</p><p className="mt-1 text-xs text-text-secondary">{shippingAddress?.phone ?? ''}</p></div>
      <div><p className="text-xs uppercase tracking-[0.12em] text-text-muted">Pickup address</p><p className="mt-2 text-sm text-text-primary">{[shippingAddress?.city, shippingAddress?.state, shippingAddress?.postalCode].filter(Boolean).join(', ') || 'Order delivery address'}</p></div>
    </div>

    <div className="grid gap-4">
      {group.requests.map((request) => {
        const line = exchangeOrderLine(request);
        const actions = request.status === 'requested' ? ['approve', 'reject'] : followUpActions[request.status] ?? [];
        return <article key={request._id} className="grid gap-5 border border-border bg-background-elevated p-5 md:grid-cols-[112px_1fr_auto] md:items-center">
          <div className="overflow-hidden border border-border bg-background-primary">
            {line?.image
              ? <img src={line.image} alt={line.title ?? line.sku ?? 'Exchange product'} className="aspect-[4/5] h-full w-full object-cover" />
              : <div className="grid aspect-[4/5] place-items-center px-3 text-center text-xs text-text-muted">No image</div>}
          </div>
          <div>
            <p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p>
            <h2 className="mt-2 font-display text-xl">{line?.title ?? request.originalItem?.sku ?? 'Exchange product'}</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-[0.1em] text-text-muted">Customer is returning</dt><dd className="mt-1 text-text-primary">{line?.sku ?? request.originalItem?.sku ?? 'Original product'}{line?.size ? ` · ${line.size}` : ''}{line?.color ? ` · ${line.color}` : ''}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.1em] text-text-muted">Requested replacement</dt><dd className="mt-1 text-text-primary">{request.requestedSku ?? 'Replacement variant'}</dd></div>
            </dl>
            <p className="mt-3 text-sm capitalize text-text-secondary">{statusLabel(request.status)}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {actions
              .filter((value) => value !== 'replacement_shipped' || canMutateShiprocket)
              .map((value) => <Button
                key={value}
                variant={value === 'reject' ? 'secondary' : 'primary'}
                onClick={() => action.mutate({ id: request._id, action: value })}
                disabled={action.isPending}
              >{value.replaceAll('_', ' ')}</Button>)}
          </div>
        </article>;
      })}
    </div>

    <footer className="flex flex-col gap-4 border border-border bg-background-elevated p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="font-display text-xl">Order-level reverse pickup</p>
        {awaitingApproval.length > 0
          ? <p className="mt-2 text-sm text-text-secondary">Approve or reject {awaitingApproval.length} remaining product{awaitingApproval.length === 1 ? '' : 's'} to unlock pickup creation.</p>
          : approvedForPickup.length > 0
            ? <p className="mt-2 text-sm text-text-secondary">One pickup will include all {approvedForPickup.length} approved product{approvedForPickup.length === 1 ? '' : 's'}.</p>
            : <p className="mt-2 text-sm text-text-secondary">There are no newly approved products waiting for pickup.</p>}
      </div>
      {canCreatePickup ? <Button
        variant="primary"
        onClick={() => action.mutate({ id: approvedForPickup[0]._id, action: 'create_reverse_pickup' })}
        disabled={action.isPending}
      >Create single pickup · {approvedForPickup.length} item{approvedForPickup.length === 1 ? '' : 's'}</Button> : null}
    </footer>
    {action.error ? <p className="text-sm text-danger">{action.error.message}</p> : null}
  </section>;
}
