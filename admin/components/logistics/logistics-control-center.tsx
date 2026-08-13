// Governed by .rules v1.0
'use client';

import { AlertTriangle, Ban, ExternalLink, FileStack, PackageCheck, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { LogisticsDocumentButtons } from '@/components/logistics/logistics-document-buttons';
import { ShiprocketShipDialog } from '@/components/logistics/shiprocket-ship-dialog';
import { DateRangeFilter, dateRangeStart, isInDateRange, type DateRange } from '@/components/dashboard/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminMe } from '@/hooks/useAdminResources';
import { compareLogisticsCouriers, useFailedLogisticsNotifications, useLogisticsAction, useLogisticsKpis, useLogisticsSyncHealth, useShipments, type CourierRate, type Shipment } from '@/hooks/useLogistics';
import { formatPrice } from '@/lib/utils';

const label = (value?: string): string => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unavailable';
const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Unavailable';
const orderId = (shipment: Shipment): string => typeof shipment.order === 'string' ? shipment.order : shipment.order?._id ?? '';

export function LogisticsControlCenter({ initialStatus }: { initialStatus?: string }): ReactNode {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus ?? '');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'warning' } | null>(null);
  const [shipDialog, setShipDialog] = useState<Shipment | null>(null);
  const [courierShipment, setCourierShipment] = useState<Shipment | null>(null);
  const [couriers, setCouriers] = useState<CourierRate[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierError, setCourierError] = useState('');
  const me = useAdminMe();
  const canMutateShiprocket = me.data?.role === 'admin' || me.data?.role === 'superadmin';
  const shipments = useShipments({ limit: 50, status: status || undefined, search: search || undefined });
  const kpis = useLogisticsKpis(dateRangeStart(dateRange)?.toISOString());
  const syncHealth = useLogisticsSyncHealth();
  const failedNotifications = useFailedLogisticsNotifications();
  const action = useLogisticsAction();
  const runAction = (path: string, success: string, body?: Record<string, unknown>): void => {
    setNotice(null);
    action.mutate({ path, body }, { onSuccess: () => setNotice({ message: success, tone: 'success' }) });
  };
  const reviewCouriers = async (shipment: Shipment): Promise<void> => {
    setCourierError('');
    setCourierLoading(true);
    try {
      const comparison = await compareLogisticsCouriers(shipment._id);
      const available = comparison.couriers.filter((courier) => courier.serviceable).sort((left, right) => left.totalCharge - right.totalCharge);
      if (!comparison.serviceable || !available.length) {
        setCourierError('No Shiprocket courier is currently serviceable for this shipment.');
        return;
      }
      setCourierShipment(shipment);
      setCouriers(available);
      setSelectedCourierId(available[0]?.courierId ?? null);
    } catch (error) {
      setCourierError(error instanceof Error ? error.message : 'Shiprocket courier rates could not be loaded.');
    } finally {
      setCourierLoading(false);
    }
  };
  const closeCourierReview = (): void => {
    if (action.isPending) return;
    setCourierShipment(null);
    setCouriers([]);
    setSelectedCourierId(null);
  };
  const assignSelectedCourier = (): void => {
    if (!courierShipment || !selectedCourierId) return;
    const selected = couriers.find((courier) => courier.courierId === selectedCourierId);
    if (!selected) return;
    action.mutate({ path: `/admin/logistics/${courierShipment._id}/assign-awb`, body: { courierId: selected.courierId } }, {
      onSuccess: () => {
        setNotice({ message: `AWB assigned by Shiprocket to ${selected.courierName}; provider values were synchronized.`, tone: 'success' });
        setCourierShipment(null);
        setCouriers([]);
        setSelectedCourierId(null);
      },
    });
  };
  const cancelShipment = (shipment: Shipment): void => {
    if (!window.confirm(`Cancel Shiprocket shipment for ${shipment.sourceOrderId}?\n\nThis changes the real provider shipment and the Cruisin order/analytics status. Payment and refunds are not changed automatically.`)) return;
    runAction(`/admin/logistics/${shipment._id}/cancel`, 'Shipment cancelled in Shiprocket and synchronized with Cruisin.');
  };
  const stats = kpis.data ? [
    ['All shipments', kpis.data.total], ['Ready to ship', kpis.data.ready], ['In transit', kpis.data.inTransit], ['Delivered', kpis.data.delivered], ['NDR', kpis.data.ndr], ['RTO', kpis.data.rto], ['Needs attention', kpis.data.errors]
  ] : [];
  const visibleShipments = (shipments.data?.items ?? []).filter((shipment) => isInDateRange(shipment.createdAt ?? shipment.updatedAt, dateRange));

  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">{stats.map(([name, value]) => <article key={String(name)} className="border border-border bg-background-elevated p-4"><p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{name}</p><p className="mt-3 font-mono text-2xl text-text-primary">{value}</p></article>)}</section>
    {syncHealth.data ? <section className="grid gap-3 border border-border bg-background-elevated p-4 text-xs text-text-secondary sm:grid-cols-4"><div><p className="text-text-muted">Active Shiprocket shipments</p><p className="mt-1 font-mono text-text-primary">{syncHealth.data.activeShipments}</p></div><div><p className="text-text-muted">Last webhook</p><p className="mt-1 text-text-primary">{formatDate(syncHealth.data.lastWebhookAt)}</p></div><div><p className="text-text-muted">Last safety-net reconciliation</p><p className="mt-1 text-text-primary">{formatDate(syncHealth.data.lastReconciliationAt)}</p></div><div><p className="text-text-muted">Active sync failures</p><p className={syncHealth.data.syncFailures ? 'mt-1 text-danger' : 'mt-1 text-success'}>{syncHealth.data.syncFailures}</p></div></section> : null}
    <DateRangeFilter value={dateRange} onChange={setDateRange} label="Logistics date range" />
    <section className="grid gap-3 border border-border bg-background-elevated p-4 md:grid-cols-[minmax(0,1fr)_240px]">
      <Input label="Search AWB, order or courier" value={search} onChange={(event) => setSearch(event.target.value)} />
      <label className="grid gap-2 text-xs uppercase tracking-[0.12em] text-text-secondary">Shipment state<select className="min-h-11 border border-border bg-background-primary px-3 text-sm normal-case tracking-normal text-text-primary" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All states</option>{['draft', 'pending_provider', 'provider_order_created', 'awb_assigned', 'pickup_scheduled', 'out_for_pickup', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_exception', 'ndr', 'rto_initiated', 'rto_in_transit', 'rto_delivered', 'lost', 'damaged', 'error'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
    </section>
    {kpis.data ? <p className="text-xs text-text-muted">Delivery {kpis.data.deliveryRate}% · NDR {kpis.data.ndrRate}% · RTO {kpis.data.rtoRate}% · Effective logistics cost {formatPrice(kpis.data.logisticsCost)} · Shiprocket billed {formatPrice(kpis.data.billedLogisticsCost)} · Quote awaiting statement {formatPrice(kpis.data.estimatedLogisticsCost)} ({kpis.data.shipmentsAwaitingBilling} shipment{kpis.data.shipmentsAwaitingBilling === 1 ? '' : 's'})</p> : null}
    {failedNotifications.data?.total ? <section className="border border-danger/50 bg-danger/10 p-4" role="status"><p className="text-sm font-medium text-danger">{failedNotifications.data.total} logistics notification event(s) need attention</p></section> : null}
    {notice ? <p role="status" className={notice.tone === 'warning' ? 'border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary' : 'border border-success/40 bg-success/10 p-3 text-sm text-text-primary'}>{notice.message}</p> : null}
    {action.error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Action failed — Retry: {action.error.message}</p> : null}
    {courierError ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{courierError}</p> : null}
    <div className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[1380px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{['Cruisin order', 'Shiprocket IDs', 'Status / pickup', 'Courier / AWB', 'Latest update', 'Last sync', 'Package / cost', 'Actions'].map((heading) => <th key={heading} className="border-b border-border p-4">{heading}</th>)}</tr></thead>
      <tbody>{shipments.isLoading ? <tr><td colSpan={8} className="p-6 text-text-secondary">Loading shipments…</td></tr> : visibleShipments.map((shipment) => {
        const latestScan = shipment.trackingScans.at(-1);
        const hasProviderOrder = Boolean(shipment.providerOrderId || shipment.providerShipmentId);
        return <tr key={shipment._id} className="border-b border-border-subtle align-top">
          <td className="p-4"><p className="font-mono text-xs text-text-primary">{shipment.sourceOrderId}</p><p className="mt-1 text-xs text-text-muted">{typeof shipment.order === 'object' ? shipment.order?.shippingAddress?.fullName : ''}</p></td>
          <td className="p-4 font-mono text-xs text-text-secondary"><p>Order: {shipment.providerOrderId ?? 'Pending'}</p><p className="mt-2">Shipment: {shipment.providerShipmentId ?? 'Pending'}</p></td>
          <td className="p-4"><span className={`inline-flex border px-2 py-1 text-xs uppercase tracking-[0.1em] ${['error', 'ndr', 'delivery_exception', 'lost', 'damaged'].includes(shipment.shipmentStatus) ? 'border-danger/50 text-danger' : 'border-border text-text-primary'}`}>{label(shipment.shipmentStatus)}</span><p className="mt-2 text-xs text-text-muted">Pickup: {label(shipment.pickupStatus)}</p>{shipment.syncErrorCode ? <p className="mt-2 text-xs text-danger">Sync error: {shipment.syncErrorCode}</p> : null}</td>
          <td className="p-4 text-text-secondary"><p>{shipment.courierName ?? 'Pending in Shiprocket'}</p><p className="mt-1 break-all font-mono text-xs">{shipment.awb ?? 'Pending in Shiprocket'}</p></td>
          <td className="p-4 text-xs text-text-secondary"><p>{latestScan?.message ?? 'No tracking events yet'}</p><p className="mt-1 text-text-muted">{latestScan?.location ?? 'Location unavailable'}</p><p className="mt-1 text-text-muted">{formatDate(latestScan?.timestamp ?? shipment.lastTrackingUpdate)}</p><p className="mt-2">ETA: {formatDate(shipment.estimatedDelivery)}</p></td>
          <td className="p-4 text-xs text-text-secondary"><p>{formatDate(shipment.lastSuccessfulSyncAt)}</p><p className="mt-1 text-text-muted">{shipment.lastSyncSource ? label(shipment.lastSyncSource) : 'Never synchronized'}</p></td>
          <td className="p-4 text-xs text-text-secondary">{shipment.package ? <>{shipment.package.deadWeightKg} kg · {shipment.package.lengthCm} × {shipment.package.breadthCm} × {shipment.package.heightCm} cm{!shipment.package.measurementConfirmed ? <span className="mt-2 flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />Confirm measurements</span> : null}</> : 'Package missing'}{shipment.providerBillingStatus === 'current' && shipment.providerBilledTotal !== undefined ? <><p className="mt-2 font-mono text-success">Billed {formatPrice(shipment.providerBilledTotal)}</p><p className="mt-1 text-[11px] text-text-muted">Shiprocket statement · {formatDate(shipment.providerBillingSyncedAt)}</p></> : <><p className="mt-2 font-mono text-warning">Quoted {formatPrice((shipment.providerShippingCost ?? 0) + (shipment.codCharge ?? 0) + (shipment.otherProviderCharges ?? 0) + (shipment.rtoCost ?? 0))}</p><p className="mt-1 text-[11px] text-text-muted">Awaiting Shiprocket statement charge</p></>}</td>
          <td className="p-4"><div className="flex max-w-96 flex-wrap gap-2">{canMutateShiprocket && !hasProviderOrder && shipment.shipmentStatus === 'draft' && orderId(shipment) ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => runAction(`/admin/logistics/orders/${orderId(shipment)}/create`, 'Shiprocket provider order created successfully.')} disabled={action.isPending}><PackageCheck className="mr-1 h-3 w-3" />Create Shiprocket Order</Button> : null}{canMutateShiprocket && hasProviderOrder ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => setShipDialog(shipment)}>Ship<ExternalLink className="ml-1 h-3 w-3" /></Button> : null}{canMutateShiprocket && hasProviderOrder && !shipment.awb ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => void reviewCouriers(shipment)} disabled={action.isPending || courierLoading}>{courierLoading ? 'Loading couriers…' : 'Assign AWB'}</Button> : null}{canMutateShiprocket && shipment.awb && !shipment.pickupDate && !['cancelled', 'delivered', 'rto_delivered'].includes(shipment.shipmentStatus) ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => runAction(`/admin/logistics/${shipment._id}/schedule-pickup`, 'Pickup scheduled in Shiprocket and provider values synchronized.')} disabled={action.isPending}><Truck className="mr-1 h-3 w-3" />Schedule pickup</Button> : null}{canMutateShiprocket && shipment.pickupDate ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => runAction(`/admin/logistics/${shipment._id}/manifest`, 'Shiprocket manifest generated.')} disabled={action.isPending}><FileStack className="mr-1 h-3 w-3" />Generate manifest</Button> : null}{canMutateShiprocket ? <LogisticsDocumentButtons shipment={shipment} compact /> : null}{canMutateShiprocket && shipment.awb && !['cancelled', 'delivered', 'rto_delivered', 'returned'].includes(shipment.shipmentStatus) ? <Button variant="danger" className="min-h-9 px-3 text-[11px]" onClick={() => cancelShipment(shipment)} disabled={action.isPending}><Ban className="mr-1 h-3 w-3" />Cancel shipment</Button> : null}</div></td>
        </tr>;
      })}{!shipments.isLoading && !visibleShipments.length ? <tr><td colSpan={8} className="p-8 text-center text-text-muted">No shipments match these filters.</td></tr> : null}</tbody>
    </table></div>
    <ShiprocketShipDialog open={Boolean(shipDialog)} pending={action.isPending} onClose={() => setShipDialog(null)} onSync={() => shipDialog && runAction(`/admin/logistics/${shipDialog._id}/sync`, 'Synced just now')} />
    {courierShipment ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="courier-review-title" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-border bg-background-primary p-6 shadow-2xl"><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Shiprocket courier selection</p><h2 id="courier-review-title" className="mt-2 font-display text-2xl">Assign AWB for {courierShipment.sourceOrderId}</h2><p className="mt-2 text-sm text-text-secondary">This creates a real Shiprocket AWB. Cruisin synchronizes the returned courier, AWB and status immediately afterward.</p><div className="mt-6 grid gap-3 md:grid-cols-2">{couriers.map((courier) => <label key={courier.courierId} className={`cursor-pointer border p-4 ${selectedCourierId === courier.courierId ? 'border-accent-gold bg-accent-gold/10' : 'border-border bg-background-elevated'}`}><span className="flex gap-3"><input type="radio" name="courier" className="mt-1" checked={selectedCourierId === courier.courierId} onChange={() => setSelectedCourierId(courier.courierId)} /><span><strong className="text-text-primary">{courier.courierName}</strong><span className="mt-2 block text-xs text-text-secondary">{label(courier.shippingMode)} · {formatPrice(courier.totalCharge)} · ETA {courier.estimatedDeliveryDate ?? (courier.estimatedDeliveryDays ? `${courier.estimatedDeliveryDays} days` : 'unavailable')}</span></span></span></label>)}</div><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={closeCourierReview} disabled={action.isPending}>Cancel</Button><Button onClick={assignSelectedCourier} disabled={!selectedCourierId || action.isPending}>{action.isPending ? 'Assigning AWB…' : 'Confirm & assign AWB'}</Button></div></section></div> : null}
  </div>;
}
