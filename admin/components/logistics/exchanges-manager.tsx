// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminExchanges, useWorkflowAction } from '@/hooks/useLogistics';
const exchangeActions: Record<string, string[]> = { requested: ['approve', 'reject'], inventory_reserved: ['create_reverse_pickup'], reverse_pickup: ['warehouse_received'], warehouse_received: ['quality_check_passed', 'quality_check_failed'], replacement_pending: ['replacement_shipped'], replacement_shipped: ['complete'], completed: ['close'], rejected: ['close'], quality_check_failed: ['close'] };
export function ExchangesManager(): ReactNode {
  const requests = useAdminExchanges();
  const action = useWorkflowAction('exchanges');
  return <div className="grid gap-4">{requests.data?.map((request) => <article key={request._id} className="grid gap-4 border border-border bg-background-elevated p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p><h2 className="mt-2 font-display text-xl">Exchange for {request.requestedSku ?? 'replacement variant'}</h2><p className="mt-2 text-sm text-text-secondary">{request.order?.orderNumber ?? 'Order'} · {request.status.replaceAll('_', ' ')}</p></div><div className="flex flex-wrap gap-2">{(exchangeActions[request.status] ?? []).map((value) => <Button key={value} variant={value === 'reject' ? 'secondary' : 'primary'} onClick={() => action.mutate({ id: request._id, action: value })} disabled={action.isPending}>{value.replaceAll('_', ' ')}</Button>)}</div></article>)}{!requests.isLoading && !requests.data?.length ? <p className="border border-border p-8 text-center text-text-muted">No exchange requests.</p> : null}{action.error ? <p className="text-sm text-danger">{action.error.message}</p> : null}</div>;
}
