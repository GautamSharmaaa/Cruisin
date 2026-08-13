'use client';

// Governed by .rules v1.0
import { AlertTriangle, Check, ChevronDown, MapPin, PackageCheck, Truck } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import type { ShipmentTracking as ShipmentTrackingData } from '@/hooks/useLogistics';
import { humanizeOrderStatus } from '@/lib/order-cancellation';

const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';
type Shipment = ShipmentTrackingData['shipments'][number];

function MilestoneJourney({ shipment }: { shipment: Shipment }): ReactNode {
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const normal = shipment.milestones.filter((milestone) => !milestone.exception);
  const exception = shipment.milestones.find((milestone) => milestone.exception);
  const updates = shipment.milestones.flatMap((milestone) => milestone.scans.map((scan) => ({ ...scan, milestone: milestone.label })));
  const currentIndex = Math.max(0, normal.findIndex((milestone) => milestone.current));
  const journeyPercent = normal.length > 1 ? Math.min(100, Math.max(0, (currentIndex / (normal.length - 1)) * 100)) : 0;
  const progressStyle = { '--journey-progress': `${journeyPercent}%` } as CSSProperties;

  return <div className="mt-6">
    {exception ? <div role="status" className="border border-danger/50 bg-danger/5 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" /><div><p className="font-medium text-text-primary">{exception.label}</p><p className="mt-1 text-sm leading-6 text-text-secondary">{exception.message}</p>{exception.reachedAt ? <p className="mt-2 text-xs text-text-muted">{formatDate(exception.reachedAt)}</p> : null}</div></div></div> : null}
    <ol aria-label="Shipment progress" className="relative mt-6 grid gap-0 md:grid-cols-6" style={progressStyle}>
      <div aria-hidden="true" className="absolute left-[1.15rem] top-5 h-[calc(100%-2.5rem)] w-px bg-border md:left-5 md:right-5 md:top-5 md:h-px md:w-auto" />
      <div aria-hidden="true" className="absolute left-[1.15rem] top-5 h-[var(--journey-progress)] w-px bg-accent-gold transition-[height] duration-700 motion-reduce:transition-none md:left-5 md:top-5 md:h-px md:w-[var(--journey-progress)] md:transition-[width]" />
      {normal.map((milestone) => {
        const moving = milestone.current && !['delivered', 'received'].includes(milestone.key);
        return <li key={milestone.key} className="relative grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-5 md:min-h-0 md:grid-cols-1 md:justify-items-center md:px-1 md:pb-0 md:text-center">
          <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${milestone.completed ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border bg-background-primary text-text-muted'}`}>
            {milestone.completed && !moving ? <Check aria-hidden="true" size={16} /> : moving ? <Truck aria-hidden="true" className="tracking-truck" size={17} /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />}<span className="sr-only">{milestone.completed ? 'Reached' : 'Not reached'}</span>
          </span>
          <div className="pt-1 md:mt-3 md:pt-0"><p className={`text-xs font-medium uppercase tracking-[0.08em] ${milestone.current ? 'text-accent-gold' : milestone.completed ? 'text-text-primary' : 'text-text-muted'}`}>{milestone.label}</p>{milestone.reachedAt ? <p className="mt-1 text-[11px] text-text-muted">{formatDate(milestone.reachedAt)}</p> : null}</div>
        </li>;
      })}
    </ol>
    <div className="mt-6 border-t border-border pt-4">
      <button type="button" aria-expanded={updatesOpen} onClick={() => setUpdatesOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-text-primary"><span>View courier updates ({updates.length})</span><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${updatesOpen ? 'rotate-180' : ''}`} /></button>
      {updatesOpen ? updates.length ? <ol className="mt-3 grid gap-4 border-l border-border pl-4">{[...updates].reverse().map((scan, index) => <li key={`${scan.timestamp}-${scan.milestone}-${index}`} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 text-accent-gold" /><div><p className="text-sm text-text-primary">{scan.message}</p><p className="mt-1 text-xs text-text-muted">{scan.location ? `${scan.location} · ` : ''}{formatDate(scan.timestamp)}</p></div></li>)}</ol> : <p className="mt-2 text-sm text-text-secondary">The first courier scan will appear after pickup.</p> : null}
    </div>
  </div>;
}

export function ShipmentTracking({ tracking }: { tracking: ShipmentTrackingData }): ReactNode {
  return <div className="grid gap-6">{tracking.shipments.length === 0 ? <section className="border border-border bg-background-elevated p-6"><PackageCheck className="h-5 w-5 text-accent-gold" /><h2 className="mt-4 font-display text-2xl">Preparing your shipment</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Your order is confirmed. Courier details will appear here as soon as the parcel is prepared.</p></section> : tracking.shipments.map((shipment) => <section key={shipment.id} className="overflow-hidden border border-border bg-background-elevated p-5 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Order {tracking.orderNumber ?? tracking.orderId} · {humanizeOrderStatus(shipment.type)}</p><h2 className="mt-2 font-display text-3xl">{shipment.latestMessage}</h2></div>{shipment.milestones.some((milestone) => milestone.exception) ? <AlertTriangle className="h-6 w-6 text-danger" /> : <Truck className="h-6 w-6 text-accent-gold" />}</header>
    <dl className="mt-5 grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2 lg:grid-cols-5"><div><dt className="text-text-muted">Courier</dt><dd className="mt-1 text-text-primary">{shipment.courierName ?? 'Being assigned'}</dd></div><div><dt className="text-text-muted">Tracking number</dt><dd className="mt-1 break-all font-mono text-xs text-text-primary">{shipment.awb ?? 'Pending'}</dd></div><div><dt className="text-text-muted">Estimated delivery</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.estimatedDelivery)}</dd></div><div><dt className="text-text-muted">Latest update</dt><dd className="mt-1 text-text-primary">{formatDate(shipment.latestUpdate)}</dd></div><div><dt className="text-text-muted">Latest location</dt><dd className="mt-1 text-text-primary">{shipment.latestLocation ?? 'Not available'}</dd></div></dl><MilestoneJourney shipment={shipment} />
  </section>)}</div>;
}
