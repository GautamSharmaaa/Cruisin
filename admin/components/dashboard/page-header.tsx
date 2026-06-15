// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps): ReactNode {
  return <header className="grid gap-4 border border-border bg-background-elevated p-5 shadow-lg md:grid-cols-[1fr_auto] md:items-end lg:p-6"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-gold">{eyebrow}</p><h1 className="mt-3 font-display text-3xl text-text-primary lg:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{subtitle}</p></div>{action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}</header>;
}
