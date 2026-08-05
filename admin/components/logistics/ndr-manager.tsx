// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLogisticsAction, useShipments } from '@/hooks/useLogistics';

const actions = [
  ['reattempt', 'Request reattempt'],
  ['confirm_availability', 'Customer available'],
  ['contacted', 'Mark contacted'],
  ['correct_address', 'Address note'],
  ['update_phone', 'Phone note'],
  ['escalate', 'Escalate'],
  ['accept_rto', 'Accept RTO']
] as const;

export function NdrManager(): ReactNode {
  const shipments = useShipments({ status: 'ndr', limit: 100 });
  const action = useLogisticsAction();
  return <div className="grid gap-4">
    {shipments.data?.items.map((shipment) => <article key={shipment._id} className="grid gap-5 border border-border bg-background-elevated p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="min-w-0"><p className="font-mono text-xs text-accent-gold">{shipment.sourceOrderId}</p><h2 className="mt-2 font-display text-xl">{shipment.ndr?.reason ?? 'Delivery attempt failed'}</h2><p className="mt-2 text-sm text-text-secondary">{shipment.courierName ?? 'Courier pending'} · AWB {shipment.awb ?? '—'} · {shipment.ndr?.attemptCount ?? 0} attempt(s)</p><p className="mt-2 text-xs text-text-muted">Current action: {shipment.ndr?.currentAction?.replaceAll('_', ' ') ?? 'none'} · Reattempt: {shipment.ndr?.reattemptStatus?.replaceAll('_', ' ') ?? 'not requested'} · RTO risk: {shipment.ndr?.rtoRisk ?? 'unrated'}</p></div>
      <div className="flex max-w-2xl flex-wrap gap-2">{actions.map(([value, text]) => <Button key={value} variant={value === 'accept_rto' ? 'danger' : 'secondary'} onClick={() => action.mutate({ path: `/admin/logistics/${shipment._id}/ndr/action`, body: { action: value, note: `Recorded from NDR dashboard: ${text}` } })} disabled={action.isPending || (value === 'reattempt' && shipment.ndr?.reattemptStatus === 'requested')}>{text}</Button>)}</div>
    </article>)}
    {!shipments.isLoading && !shipments.data?.items.length ? <p className="border border-border p-8 text-center text-text-muted">No active NDR cases.</p> : null}
    {action.error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{action.error.message}</p> : null}
  </div>;
}
