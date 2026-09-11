// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  supporting?: string;
}

export function KpiCard({ label, value, delta, supporting }: KpiCardProps): ReactNode {
  return <article className="group min-h-40 border border-border bg-background-elevated p-5 shadow-lg transition duration-300 hover:border-border-strong hover:shadow-gold lg:p-6"><div className="flex items-start justify-between gap-4"><p className="text-xs uppercase tracking-[0.15em] text-text-secondary">{label}</p><span aria-hidden="true" className="kpi-status-glow h-2 w-2 bg-accent-gold" /></div><p className="mt-6 font-mono text-3xl text-accent-gold">{value}</p>{delta ? <p className="mt-3 text-sm text-success">{delta}</p> : null}{supporting ? <p className={delta ? 'mt-2 text-xs uppercase tracking-[0.12em] text-text-muted' : 'mt-3 text-xs uppercase tracking-[0.12em] text-text-muted'}>{supporting}</p> : null}</article>;
}
