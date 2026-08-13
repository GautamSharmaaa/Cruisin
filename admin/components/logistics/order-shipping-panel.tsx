// Governed by .rules v1.0
'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { LogisticsDocumentButtons } from '@/components/logistics/logistics-document-buttons';
import { ShiprocketShipDialog } from '@/components/logistics/shiprocket-ship-dialog';
import { Button } from '@/components/ui/button';
import { useAdminMe } from '@/hooks/useAdminResources';
import { useLogisticsAction, useShipments, type Shipment } from '@/hooks/useLogistics';
import { formatPrice } from '@/lib/utils';

const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Unavailable';
const label = (value?: string): string => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unavailable';

export function OrderShippingPanel({ orderId }: { orderId: string }): ReactNode {
  const shipments = useShipments({ orderId, limit: 10 });
  const action = useLogisticsAction();
  const me = useAdminMe();
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  const canSyncShiprocket = canMutateShiprocket || me.data?.role === 'manager';
  const [notice, setNotice] = useState('');
  const [shipDialog, setShipDialog] = useState<Shipment | null>(null);
  const providerShipment = shipments.data?.items.find((shipment) => shipment.providerOrderId || shipment.providerShipmentId);

  const runAction = (path: string, success: string): void => {
    setNotice('');
    action.mutate({ path }, { onSuccess: async () => { setNotice(success); await shipments.refetch(); } });
  };
  const latestScan = (shipment: Shipment) => shipment.trackingScans.at(-1);

  return <article className="border border-border bg-background-elevated p-6">
    <h2 className="font-display text-xl">Shipping operations</h2>
    <p className="mt-2 text-sm text-text-secondary">Create the Shiprocket order here. Complete courier, AWB, manifest and pickup manually in Shiprocket; Cruisin mirrors the result and keeps label/invoice printing available.</p>
    <div className="mt-5 grid gap-5">
      {shipments.data?.items.map((shipment) => <section key={shipment._id} className="border-l border-accent-gold pl-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-accent-gold">{shipment.sourceOrderId}</p><h3 className="mt-1 text-lg text-text-primary">{label(shipment.shipmentStatus)}</h3></div>{shipment.providerOrderId || shipment.providerShipmentId ? <div className="flex flex-wrap gap-2">{canMutateShiprocket ? <Button className="min-h-9 px-4" onClick={() => setShipDialog(shipment)}>Ship <ExternalLink className="ml-2 h-3 w-3" /></Button> : null}{canSyncShiprocket ? <Button variant="secondary" className="min-h-9 px-4" onClick={() => runAction(`/admin/logistics/${shipment._id}/sync`, 'Synced just now')} disabled={action.isPending}><RefreshCw className={`mr-2 h-3 w-3 ${action.isPending ? 'animate-spin' : ''}`} />Sync now</Button> : null}{canMutateShiprocket ? <LogisticsDocumentButtons shipment={shipment} /> : null}</div> : null}</div>
        <dl className="mt-4 grid gap-3 text-xs text-text-secondary sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-text-muted">Shiprocket Order ID</dt><dd className="mt-1 break-all font-mono text-text-primary">{shipment.providerOrderId ?? 'Pending'}</dd></div>
          <div><dt className="text-text-muted">Shiprocket Shipment ID</dt><dd className="mt-1 break-all font-mono text-text-primary">{shipment.providerShipmentId ?? 'Pending'}</dd></div>
          <div><dt className="text-text-muted">Courier</dt><dd className="mt-1 text-text-primary">{shipment.courierName ?? 'Pending in Shiprocket'}</dd></div>
          <div><dt className="text-text-muted">AWB</dt><dd className="mt-1 break-all font-mono text-text-primary">{shipment.awb ?? 'Pending in Shiprocket'}</dd></div>
          <div><dt className="text-text-muted">Pickup status</dt><dd className="mt-1 text-text-primary">{label(shipment.pickupStatus)}</dd></div>
          <div><dt className="text-text-muted">Expected delivery</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.estimatedDelivery)}</dd></div>
          <div><dt className="text-text-muted">Latest tracking update</dt><dd className="mt-1 text-text-primary">{formatDate(latestScan(shipment)?.timestamp ?? shipment.lastTrackingUpdate)}</dd></div>
          <div><dt className="text-text-muted">Latest location</dt><dd className="mt-1 text-text-primary">{latestScan(shipment)?.location ?? 'Unavailable'}</dd></div>
          <div><dt className="text-text-muted">Last Shiprocket sync</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.lastSuccessfulSyncAt)}</dd></div>
        </dl>
        <details className="mt-4"><summary className="cursor-pointer text-xs uppercase tracking-[0.1em] text-text-secondary">Tracking timeline ({shipment.trackingScans.length})</summary>{shipment.trackingScans.length ? <ol className="mt-3 grid gap-3">{[...shipment.trackingScans].reverse().map((scan) => <li key={scan.fingerprint} className="border-l border-border pl-3 text-xs"><p className="text-text-primary">{scan.message}</p><p className="mt-1 text-text-muted">{scan.location ? `${scan.location} · ` : ''}{formatDate(scan.timestamp)}</p></li>)}</ol> : <p className="mt-3 text-xs text-text-muted">No Shiprocket events have been received yet.</p>}</details>
        <p className="mt-4 text-xs text-text-muted">Customer delivery {shipment.shippingChargeCollected === undefined ? 'Unavailable' : formatPrice(shipment.shippingChargeCollected)} · Courier {shipment.providerBillingStatus === 'current' && shipment.providerBilledTotal !== undefined ? `billed ${formatPrice(shipment.providerBilledTotal)} from Shiprocket statement` : `quoted ${shipment.providerShippingCost === undefined ? 'Unavailable' : formatPrice(shipment.providerShippingCost)}; statement pending`}</p>
      </section>)}
    </div>
    {notice ? <p role="status" className="mt-5 border border-success/40 bg-success/10 p-3 text-sm text-text-primary">{notice}</p> : null}
    {action.error ? <p role="alert" className="mt-5 border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Sync failed — Retry: {action.error.message}</p> : null}
    {!shipments.isLoading && !providerShipment && canMutateShiprocket ? <Button className="mt-5" onClick={() => runAction(`/admin/logistics/orders/${orderId}/create`, 'Shiprocket provider order created successfully.')} disabled={action.isPending}>{action.isPending ? 'Creating Shiprocket order…' : 'Create Shiprocket Order'}</Button> : null}
    <ShiprocketShipDialog open={Boolean(shipDialog)} pending={action.isPending} onClose={() => setShipDialog(null)} onSync={() => shipDialog && runAction(`/admin/logistics/${shipDialog._id}/sync`, 'Synced just now')} />
  </article>;
}
