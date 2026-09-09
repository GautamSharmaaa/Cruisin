// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminMe } from '@/hooks/useAdminResources';
import { useAdminExchanges, useWorkflowAction, type WorkflowRequest } from '@/hooks/useLogistics';

const exchangeActions: Record<string, string[]> = {
  requested: ['approve', 'reject'],
  reverse_pickup: ['warehouse_received'],
  warehouse_received: ['quality_check_passed', 'quality_check_failed'],
  replacement_pending: ['replacement_shipped'],
  replacement_shipped: ['complete'],
  completed: ['close'],
  rejected: ['close'],
  quality_check_failed: ['close']
};

const orderIdentity = (request: WorkflowRequest): { key: string; label: string } => {
  return {
    key: request.order?._id ?? request.order?.orderNumber ?? request._id,
    label: request.order?.orderNumber ?? 'Order'
  };
};

export function ExchangesManager(): ReactNode {
  const requests = useAdminExchanges();
  const action = useWorkflowAction('exchanges');
  const me = useAdminMe();
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  const groups = Array.from((requests.data ?? []).reduce((grouped, request) => {
    const order = orderIdentity(request);
    const existing = grouped.get(order.key);
    if (existing) existing.requests.push(request);
    else grouped.set(order.key, { ...order, requests: [request] });
    return grouped;
  }, new Map<string, { key: string; label: string; requests: WorkflowRequest[] }>()).values());

  return <div className="grid gap-5">
    {groups.map((group) => {
      const awaitingApproval = group.requests.filter((request) => request.status === 'requested');
      const approvedForPickup = group.requests.filter((request) => request.status === 'inventory_reserved' && !request.reverseShipment);
      const canCreatePickup = canMutateShiprocket && awaitingApproval.length === 0 && approvedForPickup.length > 0;
      return <section key={group.key} className="border border-border bg-background-elevated">
        <header className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs text-accent-gold">{group.label}</p>
            <h2 className="mt-2 font-display text-xl">{group.requests.length} exchange product{group.requests.length === 1 ? '' : 's'}</h2>
            {awaitingApproval.length > 0 && approvedForPickup.length > 0
              ? <p className="mt-2 text-sm text-text-secondary">Approve or reject the remaining {awaitingApproval.length} product{awaitingApproval.length === 1 ? '' : 's'} before creating one pickup.</p>
              : approvedForPickup.length > 1
                ? <p className="mt-2 text-sm text-text-secondary">All products are approved. They will be collected in one reverse pickup.</p>
                : null}
          </div>
          {canCreatePickup ? <Button
            variant="primary"
            onClick={() => action.mutate({ id: approvedForPickup[0]._id, action: 'create_reverse_pickup' })}
            disabled={action.isPending}
          >Create one reverse pickup · {approvedForPickup.length} item{approvedForPickup.length === 1 ? '' : 's'}</Button> : null}
        </header>
        <div className="divide-y divide-border">
          {group.requests.map((request) => <article key={request._id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p>
              <h3 className="mt-2 font-display text-lg">Exchange for {request.requestedSku ?? 'replacement variant'}</h3>
              <p className="mt-1 text-sm text-text-secondary">
                {request.originalItem?.sku ? `${request.originalItem.sku} · ` : ''}{request.status.replaceAll('_', ' ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(exchangeActions[request.status] ?? [])
                .filter((value) => value !== 'replacement_shipped' || canMutateShiprocket)
                .map((value) => <Button
                  key={value}
                  variant={value === 'reject' ? 'secondary' : 'primary'}
                  onClick={() => action.mutate({ id: request._id, action: value })}
                  disabled={action.isPending}
                >{value.replaceAll('_', ' ')}</Button>)}
            </div>
          </article>)}
        </div>
      </section>;
    })}
    {!requests.isLoading && !requests.data?.length ? <p className="border border-border p-8 text-center text-text-muted">No exchange requests.</p> : null}
    {action.error ? <p className="text-sm text-danger">{action.error.message}</p> : null}
  </div>;
}
