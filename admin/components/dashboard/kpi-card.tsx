// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  supporting?: string;
}

export function KpiCard({ label, value, delta, supporting }: KpiCardProps): ReactNode {
  return <article className="group min-h-40 border border-border bg-background-elevated p-5 shadow-lg transition duration-300 hover:border-border-strong hover:shadow-gold lg:p-6"><div className="flex items-start justify-between gap-4"><p className="text-xs uppercase tracking-[0.15em] text-text-secondary">{label}</p><span className="h-2 w-2 bg-accent-gold opacity-60 transition group-hover:opacity-100" /></div><p className="mt-6 font-mono text-3xl text-accent-gold">{value}</p><p className="mt-3 text-sm text-success">{delta}</p>{supporting ? <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-muted">{supporting}</p> : null}</article>;
}
