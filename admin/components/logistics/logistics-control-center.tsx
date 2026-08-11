// Governed by .rules v1.0
'use client';

import { AlertTriangle, ExternalLink, PackageCheck, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ShiprocketShipDialog } from '@/components/logistics/shiprocket-ship-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFailedLogisticsNotifications, useLogisticsAction, useLogisticsKpis, useLogisticsSyncHealth, useShipments, type Shipment } from '@/hooks/useLogistics';
import { formatPrice } from '@/lib/utils';

const label = (value?: string): string => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unavailable';
const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Unavailable';
const orderId = (shipment: Shipment): string => typeof shipment.order === 'string' ? shipment.order : shipment.order?._id ?? '';

export function LogisticsControlCenter({ initialStatus }: { initialStatus?: string }): ReactNode {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus ?? '');
  const [notice, setNotice] = useState('');
  const [shipDialog, setShipDialog] = useState<Shipment | null>(null);
  const shipments = useShipments({ limit: 50, status: status || undefined, search: search || undefined });
  const kpis = useLogisticsKpis();
  const syncHealth = useLogisticsSyncHealth();
  const failedNotifications = useFailedLogisticsNotifications();
  const action = useLogisticsAction();
  const runAction = (path: string, success: string): void => {
    setNotice('');
    action.mutate({ path }, { onSuccess: () => setNotice(success) });
  };
  const stats = kpis.data ? [
    ['All shipments', kpis.data.total], ['Ready to ship', kpis.data.ready], ['In transit', kpis.data.inTransit], ['Delivered', kpis.data.delivered], ['NDR', kpis.data.ndr], ['RTO', kpis.data.rto], ['Needs attention', kpis.data.errors]
  ] : [];

  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">{stats.map(([name, value]) => <article key={String(name)} className="border border-border bg-background-elevated p-4"><p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{name}</p><p className="mt-3 font-mono text-2xl text-text-primary">{value}</p></article>)}</section>
    {syncHealth.data ? <section className="grid gap-3 border border-border bg-background-elevated p-4 text-xs text-text-secondary sm:grid-cols-4"><div><p className="text-text-muted">Active Shiprocket shipments</p><p className="mt-1 font-mono text-text-primary">{syncHealth.data.activeShipments}</p></div><div><p className="text-text-muted">Last webhook</p><p className="mt-1 text-text-primary">{formatDate(syncHealth.data.lastWebhookAt)}</p></div><div><p className="text-text-muted">Last safety-net reconciliation</p><p className="mt-1 text-text-primary">{formatDate(syncHealth.data.lastReconciliationAt)}</p></div><div><p className="text-text-muted">Active sync failures</p><p className={syncHealth.data.syncFailures ? 'mt-1 text-danger' : 'mt-1 text-success'}>{syncHealth.data.syncFailures}</p></div></section> : null}
    <section className="grid gap-3 border border-border bg-background-elevated p-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
      <Input label="Search AWB, order or courier" value={search} onChange={(event) => setSearch(event.target.value)} />
      <label className="grid gap-2 text-xs uppercase tracking-[0.12em] text-text-secondary">Shipment state<select className="min-h-11 border border-border bg-background-primary px-3 text-sm normal-case tracking-normal text-text-primary" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All states</option>{['draft', 'pending_provider', 'provider_order_created', 'awb_assigned', 'pickup_scheduled', 'out_for_pickup', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_exception', 'ndr', 'rto_initiated', 'rto_in_transit', 'rto_delivered', 'lost', 'damaged', 'error'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <Button variant="secondary" onClick={() => void shipments.refetch()} disabled={shipments.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${shipments.isFetching ? 'animate-spin' : ''}`} />Refresh</Button>
    </section>
    {kpis.data ? <p className="text-xs text-text-muted">Delivery {kpis.data.deliveryRate}% · NDR {kpis.data.ndrRate}% · RTO {kpis.data.rtoRate}% · Recorded logistics cost {formatPrice(kpis.data.logisticsCost)}</p> : null}
    {failedNotifications.data?.total ? <section className="border border-danger/50 bg-danger/10 p-4" role="status"><p className="text-sm font-medium text-danger">{failedNotifications.data.total} logistics notification event(s) need attention</p></section> : null}
    {notice ? <p role="status" className="border border-success/40 bg-success/10 p-3 text-sm text-text-primary">{notice}</p> : null}
    {action.error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Sync failed — Retry: {action.error.message}</p> : null}
    <div className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[1380px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{['Cruisin order', 'Shiprocket IDs', 'Status / pickup', 'Courier / AWB', 'Latest update', 'Last sync', 'Package / cost', 'Actions'].map((heading) => <th key={heading} className="border-b border-border p-4">{heading}</th>)}</tr></thead>
      <tbody>{shipments.isLoading ? <tr><td colSpan={8} className="p-6 text-text-secondary">Loading shipments…</td></tr> : shipments.data?.items.map((shipment) => {
        const latestScan = shipment.trackingScans.at(-1);
        const hasProviderOrder = Boolean(shipment.providerOrderId || shipment.providerShipmentId);
        return <tr key={shipment._id} className="border-b border-border-subtle align-top">
          <td className="p-4"><p className="font-mono text-xs text-text-primary">{shipment.sourceOrderId}</p><p className="mt-1 text-xs text-text-muted">{typeof shipment.order === 'object' ? shipment.order?.shippingAddress?.fullName : ''}</p></td>
          <td className="p-4 font-mono text-xs text-text-secondary"><p>Order: {shipment.providerOrderId ?? 'Pending'}</p><p className="mt-2">Shipment: {shipment.providerShipmentId ?? 'Pending'}</p></td>
          <td className="p-4"><span className={`inline-flex border px-2 py-1 text-xs uppercase tracking-[0.1em] ${['error', 'ndr', 'delivery_exception', 'lost', 'damaged'].includes(shipment.shipmentStatus) ? 'border-danger/50 text-danger' : 'border-border text-text-primary'}`}>{label(shipment.shipmentStatus)}</span><p className="mt-2 text-xs text-text-muted">Pickup: {label(shipment.pickupStatus)}</p>{shipment.syncErrorCode ? <p className="mt-2 text-xs text-danger">Sync error: {shipment.syncErrorCode}</p> : null}</td>
          <td className="p-4 text-text-secondary"><p>{shipment.courierName ?? 'Pending in Shiprocket'}</p><p className="mt-1 break-all font-mono text-xs">{shipment.awb ?? 'Pending in Shiprocket'}</p></td>
          <td className="p-4 text-xs text-text-secondary"><p>{latestScan?.message ?? 'No tracking events yet'}</p><p className="mt-1 text-text-muted">{latestScan?.location ?? 'Location unavailable'}</p><p className="mt-1 text-text-muted">{formatDate(latestScan?.timestamp ?? shipment.lastTrackingUpdate)}</p><p className="mt-2">ETA: {formatDate(shipment.estimatedDelivery)}</p></td>
          <td className="p-4 text-xs text-text-secondary"><p>{formatDate(shipment.lastSuccessfulSyncAt)}</p><p className="mt-1 text-text-muted">{shipment.lastSyncSource ? label(shipment.lastSyncSource) : 'Never synchronized'}</p></td>
          <td className="p-4 text-xs text-text-secondary">{shipment.package ? <>{shipment.package.deadWeightKg} kg · {shipment.package.lengthCm} × {shipment.package.breadthCm} × {shipment.package.heightCm} cm{!shipment.package.measurementConfirmed ? <span className="mt-2 flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />Confirm measurements</span> : null}</> : 'Package missing'}<p className="mt-2 font-mono">{formatPrice((shipment.providerShippingCost ?? 0) + (shipment.codCharge ?? 0))}</p></td>
          <td className="p-4"><div className="flex max-w-64 flex-wrap gap-2">{!hasProviderOrder && shipment.shipmentStatus === 'draft' && orderId(shipment) ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => runAction(`/admin/logistics/orders/${orderId(shipment)}/create`, 'Shiprocket provider order created successfully.')} disabled={action.isPending}><PackageCheck className="mr-1 h-3 w-3" />Create Shiprocket Order</Button> : null}{hasProviderOrder ? <><Button className="min-h-9 px-3 text-[11px]" onClick={() => setShipDialog(shipment)}>Ship<ExternalLink className="ml-1 h-3 w-3" /></Button><Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => runAction(`/admin/logistics/${shipment._id}/sync`, 'Synced just now')} disabled={action.isPending}>Sync now</Button></> : null}</div></td>
        </tr>;
      })}{!shipments.isLoading && !shipments.data?.items.length ? <tr><td colSpan={8} className="p-8 text-center text-text-muted">No shipments match these filters.</td></tr> : null}</tbody>
    </table></div>
    <ShiprocketShipDialog open={Boolean(shipDialog)} pending={action.isPending} onClose={() => setShipDialog(null)} onSync={() => shipDialog && runAction(`/admin/logistics/${shipDialog._id}/sync`, 'Synced just now')} />
  </div>;
}
