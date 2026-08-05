// Governed by .rules v1.0
'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShipmentTracking } from '@/components/account/shipment-tracking';
import { useOrderTracking } from '@/hooks/useLogistics';

export default function TrackingPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const tracking = useOrderTracking(params.id);
  return <main className="mx-auto min-h-[70vh] max-w-5xl px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-36">
    <Link href={`/account/orders/${params.id}`} className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" />Order details</Link>
    <header className="mt-5 border-b border-border pb-8"><p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">Shipment journey</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">Track {tracking.data?.orderNumber ?? 'your order'}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">Courier scans are normalized into a clear timeline. This page refreshes automatically.</p></header>
    <div className="mt-8">{tracking.isLoading ? <p className="text-sm text-text-secondary">Loading shipment tracking…</p> : null}{tracking.error ? <p role="alert" className="text-sm text-danger">{tracking.error.message}</p> : null}{tracking.data ? <ShipmentTracking tracking={tracking.data} /> : null}</div>
  </main>;
}
