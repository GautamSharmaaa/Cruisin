// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLogisticsAnalytics } from '@/hooks/useLogistics';
import { formatPrice } from '@/lib/utils';

export function LogisticsAnalytics(): ReactNode {
  const [days, setDays] = useState(30);
  const analytics = useLogisticsAnalytics(days);
  return <div className="grid gap-6">
    <div className="flex flex-wrap gap-2">{[7, 30, 90].map((value) => <button key={value} className={`min-h-11 border px-4 text-xs uppercase tracking-[0.12em] ${days === value ? 'border-accent-gold text-accent-gold' : 'border-border text-text-secondary'}`} onClick={() => setDays(value)}>{value} days</button>)}</div>
    <section className="grid gap-6 xl:grid-cols-2">
      <article className="border border-border bg-background-elevated p-5"><h2 className="font-display text-2xl">Daily shipment cost</h2><p className="mt-2 text-xs text-text-muted">Billed statement charges are used when available; remaining shipments retain their clearly marked quote.</p><div className="mt-5 grid gap-3">{analytics.data?.daily.map((row) => <div key={row._id} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-xs"><span className="text-text-muted">{row._id}</span><span className="h-2 bg-accent-gold/30"><span className="block h-full bg-accent-gold" style={{ width: `${Math.min(100, row.shipments * 10)}%` }} /></span><span className="text-right font-mono">{row.shipments} · {formatPrice(row.cost)}<small className="block font-body text-[10px] text-text-muted">{row.billedShipments} billed · {row.estimatedShipments} quoted</small></span></div>)}</div></article>
      <article className="border border-border bg-background-elevated p-5"><h2 className="font-display text-2xl">Courier scorecard</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-text-muted"><th className="pb-3">Courier</th><th className="pb-3">Shipments</th><th className="pb-3">Delivered</th><th className="pb-3">NDR</th><th className="pb-3">Cost</th></tr></thead><tbody>{analytics.data?.couriers.map((row) => <tr key={row._id} className="border-t border-border-subtle"><td className="py-3">{row._id}</td><td>{row.shipments}</td><td>{row.delivered}</td><td>{row.ndr}</td><td>{formatPrice(row.cost)}<small className="block text-[10px] text-text-muted">{row.billedShipments} billed · {row.estimatedShipments} quoted</small></td></tr>)}</tbody></table></div></article>
    </section>
    <article className="border border-border bg-background-elevated p-5"><h2 className="font-display text-2xl">Status mix</h2><div className="mt-5 flex flex-wrap gap-3">{analytics.data?.statuses.map((row) => <span key={row._id} className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-text-secondary">{row._id.replaceAll('_', ' ')} · {row.count}</span>)}</div></article>
    {analytics.error ? <p className="text-sm text-danger">{analytics.error.message}</p> : null}
  </div>;
}
