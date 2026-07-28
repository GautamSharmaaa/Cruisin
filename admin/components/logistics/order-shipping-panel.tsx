// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useLogisticsAction, useShipments } from '@/hooks/useLogistics';
export function OrderShippingPanel({ orderId }: { orderId: string }): ReactNode {
  const shipments = useShipments({ search: orderId, limit: 10 });
  const action = useLogisticsAction();
  return <article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">Shipping operations</h2><p className="mt-2 text-sm text-text-secondary">Payment and fulfilment stay separate. Create a provider order only after package measurements are ready.</p><div className="mt-4 grid gap-3">{shipments.data?.items.map((shipment) => <div key={shipment._id} className="border-l border-accent-gold pl-4 text-sm"><p className="text-text-primary">{shipment.shipmentStatus.replaceAll('_', ' ')}</p><p className="mt-1 font-mono text-xs text-text-muted">{shipment.awb ?? shipment.providerShipmentId ?? 'Draft'}</p></div>)}</div>{!shipments.isLoading && !shipments.data?.items.length ? <Button className="mt-5" onClick={() => action.mutate({ path: `/admin/logistics/orders/${orderId}/create` })} disabled={action.isPending}>Prepare shipment</Button> : null}</article>;
}
