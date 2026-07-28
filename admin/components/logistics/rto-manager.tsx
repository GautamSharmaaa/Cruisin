// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLogisticsAction, useShipments } from '@/hooks/useLogistics';

export function RtoManager(): ReactNode {
  const shipments = useShipments({ status: 'rto', limit: 100 });
  const action = useLogisticsAction();
  return <div className="grid gap-4">
    {shipments.data?.items.map((shipment) => {
      const recovery = shipment.rto?.inventoryRecoveryStatus ?? 'not_started';
      const canReceive = !['inspection_pending', 'restored', 'damaged'].includes(recovery);
      const canInspect = recovery === 'inspection_pending';
      return <article key={shipment._id} className="grid gap-5 border border-border bg-background-elevated p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0"><p className="font-mono text-xs text-accent-gold">{shipment.sourceOrderId}</p><h2 className="mt-2 font-display text-xl">{shipment.rto?.reason ?? shipment.shipmentStatus.replaceAll('_', ' ')}</h2><p className="mt-2 text-sm text-text-secondary">{shipment.courierName ?? 'Courier pending'} · AWB {shipment.awb ?? '—'}</p><p className="mt-2 text-xs text-text-muted">RTO: {shipment.rto?.status?.replaceAll('_', ' ') ?? 'initiated'} · Inventory: {recovery.replaceAll('_', ' ')} · Location: {shipment.rto?.currentLocation ?? 'unavailable'}</p></div>
        <div className="flex flex-wrap gap-2">{canReceive ? <Button variant="secondary" onClick={() => action.mutate({ path: `/admin/logistics/${shipment._id}/rto/warehouse`, body: { action: 'received' } })} disabled={action.isPending}>Record receipt</Button> : null}{canInspect ? <><Button onClick={() => action.mutate({ path: `/admin/logistics/${shipment._id}/rto/warehouse`, body: { action: 'inspection_passed' } })} disabled={action.isPending}>Pass inspection</Button><Button variant="danger" onClick={() => action.mutate({ path: `/admin/logistics/${shipment._id}/rto/warehouse`, body: { action: 'inspection_failed' } })} disabled={action.isPending}>Mark damaged</Button></> : null}</div>
      </article>;
    })}
    {!shipments.isLoading && !shipments.data?.items.length ? <p className="border border-border p-8 text-center text-text-muted">No active RTO cases.</p> : null}
    {action.error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{action.error.message}</p> : null}
  </div>;
}
