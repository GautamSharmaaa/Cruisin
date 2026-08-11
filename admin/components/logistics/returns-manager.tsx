// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminMe } from '@/hooks/useAdminResources';
import { useAdminReturns, useWorkflowAction } from '@/hooks/useLogistics';
const returnActions: Record<string, string[]> = { requested: ['approved', 'rejected', 'more_information'], approved: ['create_reverse_pickup'], reverse_pickup: ['warehouse_received'], warehouse_received: ['quality_check_passed', 'quality_check_failed'], quality_check_passed: ['refund_pending'], refund_pending: ['refunded'], refunded: ['closed'] };
export function ReturnsManager(): ReactNode {
  const requests = useAdminReturns();
  const action = useWorkflowAction('returns');
  const me = useAdminMe();
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  return <div className="grid gap-4">{requests.data?.map((request) => <article key={request._id} className="grid gap-4 border border-border bg-background-elevated p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p><h2 className="mt-2 font-display text-xl">{request.reason ?? 'Customer return'}</h2><p className="mt-2 text-sm text-text-secondary">{request.order?.orderNumber ?? 'Order'} · {request.status.replaceAll('_', ' ')} · Refund {request.refundStatus ?? 'not started'}</p></div><div className="flex flex-wrap gap-2">{(returnActions[request.status] ?? []).filter((value) => value !== 'create_reverse_pickup' || canMutateShiprocket).map((value) => <Button key={value} variant={value.includes('reject') ? 'secondary' : 'primary'} onClick={() => action.mutate({ id: request._id, action: value })} disabled={action.isPending}>{value.replaceAll('_', ' ')}</Button>)}</div></article>)}{!requests.isLoading && !requests.data?.length ? <p className="border border-border p-8 text-center text-text-muted">No return requests.</p> : null}{action.error ? <p className="text-sm text-danger">{action.error.message}</p> : null}</div>;
}
