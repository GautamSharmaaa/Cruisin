// Governed by .rules v1.0
import { MapPin, PackageCheck, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ShipmentTracking as ShipmentTrackingData } from '@/hooks/useLogistics';
import { humanizeOrderStatus } from '@/lib/order-cancellation';

const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';

export function ShipmentTracking({ tracking }: { tracking: ShipmentTrackingData }): ReactNode {
  return <div className="grid gap-6">
    {tracking.shipments.length === 0 ? <section className="border border-border bg-background-elevated p-6"><PackageCheck className="h-5 w-5 text-accent-gold" /><h2 className="mt-4 font-display text-2xl">Preparing your shipment</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Your order is confirmed. Courier details will appear here as soon as the parcel is prepared.</p></section> : tracking.shipments.map((shipment) => <section key={shipment.id} className="border border-border bg-background-elevated p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">{humanizeOrderStatus(shipment.type)} shipment</p><h2 className="mt-2 font-display text-3xl">{humanizeOrderStatus(shipment.status)}</h2></div><Truck className="h-6 w-6 text-accent-gold" /></header>
      <dl className="mt-5 grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2 lg:grid-cols-5"><div><dt className="text-text-muted">Courier</dt><dd className="mt-1 text-text-primary">{shipment.courierName ?? 'Being assigned'}</dd></div><div><dt className="text-text-muted">Tracking number</dt><dd className="mt-1 break-all font-mono text-xs text-text-primary">{shipment.awb ?? 'Pending'}</dd></div><div><dt className="text-text-muted">Estimated delivery</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.estimatedDelivery)}</dd></div><div><dt className="text-text-muted">Latest update</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.latestUpdate)}</dd></div><div><dt className="text-text-muted">Latest location</dt><dd className="mt-1 text-text-primary">{shipment.latestLocation ?? 'Not available'}</dd></div></dl>
      {shipment.scans.length ? <ol className="mt-5 grid gap-4">{[...shipment.scans].reverse().map((scan, index) => <li key={`${scan.timestamp}-${scan.status}-${index}`} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3"><MapPin className="mt-0.5 h-4 w-4 text-accent-gold" /><div><p className="text-sm text-text-primary">{scan.message}</p><p className="mt-1 text-xs text-text-muted">{scan.location ? `${scan.location} · ` : ''}{formatDate(scan.timestamp)}</p></div></li>)}</ol> : <p className="mt-5 text-sm text-text-secondary">The first courier scan will appear after pickup.</p>}
    </section>)}
  </div>;
}
