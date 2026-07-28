// Governed by .rules v1.0
'use client';

import { AlertTriangle, FileText, PackageCheck, Printer, RefreshCw, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getLogisticsDocumentAccess, useFailedLogisticsNotifications, useLogisticsAction, useLogisticsKpis, useShipments, type Shipment } from '@/hooks/useLogistics';
import { formatPrice } from '@/lib/utils';

const label = (value: string): string => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const orderId = (shipment: Shipment): string => typeof shipment.order === 'string' ? shipment.order : shipment.order?._id ?? '';

export function LogisticsControlCenter({ initialStatus }: { initialStatus?: string }): ReactNode {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus ?? '');
  const [documentNotice, setDocumentNotice] = useState('');
  const shipments = useShipments({ limit: 50, status: status || undefined, search: search || undefined });
  const kpis = useLogisticsKpis();
  const failedNotifications = useFailedLogisticsNotifications();
  const action = useLogisticsAction();
  const operate = (path: string, body?: Record<string, unknown>): void => action.mutate({ path, body });
  const generateDocument = (shipmentId: string, kind: 'label' | 'invoice' | 'manifest', print = false): void => {
    const popup = print ? window.open('about:blank', '_blank') : null;
    if (print && !popup) {
      setDocumentNotice('Allow pop-ups to open the secure label print preview.');
      return;
    }
    if (popup) {
      popup.opener = null;
      popup.document.title = 'Preparing Cruisin label';
      popup.document.body.textContent = 'Preparing secure label preview…';
    }
    setDocumentNotice('');
    action.mutate({ path: `/admin/logistics/${shipmentId}/${kind}` }, {
      onSuccess: () => {
        void getLogisticsDocumentAccess(shipmentId, kind).then((document) => {
          setDocumentNotice(`${label(kind)} ready until ${new Date(document.expiresAt).toLocaleTimeString('en-IN')}.`);
          if (!popup) return;
          popup.document.body.replaceChildren();
          const heading = popup.document.createElement('h1');
          heading.textContent = `Cruisin ${label(kind)}`;
          popup.document.body.append(heading);
          if (document.url.startsWith('https://')) {
            const frame = popup.document.createElement('iframe');
            frame.src = document.url;
            frame.title = `${label(kind)} document`;
            frame.style.width = '100%';
            frame.style.height = '80vh';
            frame.addEventListener('load', () => popup.print(), { once: true });
            popup.document.body.append(frame);
          } else {
            const reference = popup.document.createElement('p');
            reference.textContent = `Mock document reference: ${document.url}`;
            popup.document.body.append(reference);
            popup.print();
          }
        }).catch((error: unknown) => {
          setDocumentNotice(error instanceof Error ? error.message : `${label(kind)} access could not be loaded.`);
          popup?.close();
        });
      },
      onError: () => popup?.close()
    });
  };
  const stats = kpis.data ? [
    ['All shipments', kpis.data.total],
    ['Ready to ship', kpis.data.ready],
    ['In transit', kpis.data.inTransit],
    ['Delivered', kpis.data.delivered],
    ['NDR', kpis.data.ndr],
    ['RTO', kpis.data.rto],
    ['Needs attention', kpis.data.errors]
  ] : [];

  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">{stats.map(([name, value]) => <article key={String(name)} className="border border-border bg-background-elevated p-4"><p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{name}</p><p className="mt-3 font-mono text-2xl text-text-primary">{value}</p></article>)}</section>
    <section className="grid gap-3 border border-border bg-background-elevated p-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
      <Input label="Search AWB, order or courier" value={search} onChange={(event) => setSearch(event.target.value)} />
      <label className="grid gap-2 text-xs uppercase tracking-[0.12em] text-text-secondary">Shipment state<select className="min-h-11 border border-border bg-background-primary px-3 text-sm normal-case tracking-normal text-text-primary" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All states</option>{['draft', 'pending_provider', 'provider_order_created', 'awb_assigned', 'pickup_scheduled', 'in_transit', 'delivered', 'ndr', 'rto_initiated', 'rto_in_transit', 'rto_delivered', 'error'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <Button variant="secondary" onClick={() => void shipments.refetch()} disabled={shipments.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${shipments.isFetching ? 'animate-spin' : ''}`} />Refresh</Button>
    </section>
    {kpis.data ? <p className="text-xs text-text-muted">Delivery {kpis.data.deliveryRate}% · NDR {kpis.data.ndrRate}% · RTO {kpis.data.rtoRate}% · Recorded logistics cost {formatPrice(kpis.data.logisticsCost)}</p> : null}
    {failedNotifications.data?.total ? <section className="border border-danger/50 bg-danger/10 p-4" role="status"><p className="text-sm font-medium text-danger">{failedNotifications.data.total} logistics notification event(s) need attention</p><div className="mt-2 grid gap-1 text-xs text-text-secondary">{failedNotifications.data.items.slice(0, 3).map((event) => <p key={event._id}>{label(event.eventType)} · {event.deliveries.filter((delivery) => delivery.status === 'failed').map((delivery) => delivery.channel).join(', ') || event.status}</p>)}</div></section> : null}
    <div className="overflow-x-auto border border-border bg-background-elevated">
      <table className="w-full min-w-[1120px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{['Order', 'Type', 'Status', 'Courier / AWB', 'Package', 'Cost', 'Updated', 'Actions'].map((heading) => <th key={heading} className="border-b border-border p-4">{heading}</th>)}</tr></thead>
        <tbody>{shipments.isLoading ? <tr><td colSpan={8} className="p-6 text-text-secondary">Loading shipments…</td></tr> : shipments.data?.items.map((shipment) => <tr key={shipment._id} className="border-b border-border-subtle align-top">
          <td className="p-4"><p className="font-mono text-xs text-text-primary">{shipment.sourceOrderId}</p><p className="mt-1 text-xs text-text-muted">{typeof shipment.order === 'object' ? shipment.order?.shippingAddress?.fullName : ''}</p></td>
          <td className="p-4 text-text-secondary">{label(shipment.shipmentType)}</td>
          <td className="p-4"><span className={`inline-flex border px-2 py-1 text-xs uppercase tracking-[0.1em] ${shipment.shipmentStatus === 'error' || shipment.shipmentStatus === 'ndr' ? 'border-danger/50 text-danger' : 'border-border text-text-primary'}`}>{label(shipment.shipmentStatus)}</span>{shipment.lastProviderError ? <p className="mt-2 max-w-52 text-xs leading-5 text-danger">{shipment.lastProviderError.message}</p> : null}</td>
          <td className="p-4 text-text-secondary"><p>{shipment.courierName ?? 'Not assigned'}</p><p className="mt-1 break-all font-mono text-xs">{shipment.awb ?? '—'}</p></td>
          <td className="p-4 text-xs text-text-secondary">{shipment.package ? <>{shipment.package.deadWeightKg} kg<br />{shipment.package.lengthCm} × {shipment.package.breadthCm} × {shipment.package.heightCm} cm{!shipment.package.measurementConfirmed ? <span className="mt-2 flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />Confirm measurements</span> : null}</> : 'Missing'}</td>
          <td className="p-4 font-mono text-xs text-text-secondary">{formatPrice((shipment.providerShippingCost ?? 0) + (shipment.codCharge ?? 0))}</td>
          <td className="p-4 text-xs text-text-muted">{new Date(shipment.updatedAt).toLocaleString('en-IN')}</td>
          <td className="p-4"><div className="flex max-w-72 flex-wrap gap-2">
            {shipment.shipmentStatus === 'draft' && orderId(shipment) ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => operate(`/admin/logistics/orders/${orderId(shipment)}/create`)} disabled={action.isPending}><PackageCheck className="mr-1 h-3 w-3" />Create</Button> : null}
            {shipment.shipmentStatus === 'provider_order_created' ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => operate(`/admin/logistics/${shipment._id}/assign-awb`)} disabled={action.isPending}>Assign AWB</Button> : null}
            {shipment.shipmentStatus === 'awb_assigned' ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => operate(`/admin/logistics/${shipment._id}/schedule-pickup`)} disabled={action.isPending}><Truck className="mr-1 h-3 w-3" />Pickup</Button> : null}
            {shipment.providerShipmentId ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => operate(`/admin/logistics/${shipment._id}/track`)} disabled={action.isPending}>Track</Button> : null}
            {shipment.providerShipmentId ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => generateDocument(shipment._id, 'label')} disabled={action.isPending}><FileText className="mr-1 h-3 w-3" />Label</Button> : null}
            {shipment.providerShipmentId ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => generateDocument(shipment._id, 'invoice')} disabled={action.isPending}>Invoice</Button> : null}
            {shipment.providerShipmentId ? <Button variant="secondary" className="min-h-9 px-3 text-[11px]" onClick={() => generateDocument(shipment._id, 'manifest')} disabled={action.isPending}>Manifest</Button> : null}
            {shipment.providerShipmentId ? <Button className="min-h-9 px-3 text-[11px]" onClick={() => generateDocument(shipment._id, 'label', true)} disabled={action.isPending}><Printer className="mr-1 h-3 w-3" />Print Label</Button> : null}
          </div></td>
        </tr>)}{!shipments.isLoading && !shipments.data?.items.length ? <tr><td colSpan={8} className="p-8 text-center text-text-muted">No shipments match these filters.</td></tr> : null}</tbody>
      </table>
    </div>
    {action.error ? <p role="alert" className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{action.error.message}</p> : null}
    {documentNotice ? <p aria-live="polite" className="border border-border bg-background-elevated p-3 text-sm text-text-secondary">{documentNotice}</p> : null}
  </div>;
}
