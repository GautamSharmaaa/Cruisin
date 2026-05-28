// Governed by .rules v1.0
import type { ReactNode } from 'react';
export interface KpiCardProps { label: string; value: string; delta: string; }
export function KpiCard({ label, value, delta }: KpiCardProps): ReactNode { return <article className="border border-border bg-background-elevated p-6"><p className="text-xs uppercase tracking-[0.15em] text-text-secondary">{label}</p><p className="mt-4 font-mono text-2xl text-accent-gold">{value}</p><p className="mt-2 text-sm text-success">{delta}</p></article>; }
