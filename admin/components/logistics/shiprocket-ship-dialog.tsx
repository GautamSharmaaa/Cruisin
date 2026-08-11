// Governed by .rules v1.0
'use client';

import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { SHIPROCKET_DASHBOARD_URL } from '@/constants/config';

export function ShiprocketShipDialog({ open, pending, onClose, onSync }: { open: boolean; pending: boolean; onClose: () => void; onSync: () => void }): ReactNode {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="shiprocket-ship-title" className="w-full max-w-xl border border-border bg-background-primary p-6 shadow-2xl">
      <h2 id="shiprocket-ship-title" className="font-display text-3xl text-text-primary">Ship this order</h2>
      <p className="mt-4 text-sm leading-6 text-text-secondary">The Shiprocket order has already been created.</p>
      <p className="mt-3 text-sm leading-6 text-text-secondary">Complete courier selection, AWB, label, manifest and pickup from the Shiprocket dashboard.</p>
      <p className="mt-3 text-sm leading-6 text-text-secondary">Cruisin will automatically synchronize shipment updates.</p>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="secondary" onClick={onSync} disabled={pending}>{pending ? 'Syncing…' : 'Sync now'}</Button>
        <a href={SHIPROCKET_DASHBOARD_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110">Open Shiprocket<ExternalLink className="ml-2 h-4 w-4" /></a>
      </div>
    </section>
  </div>;
}
