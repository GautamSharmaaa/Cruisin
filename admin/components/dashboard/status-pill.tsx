// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface StatusPillProps {
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'gold';
  children: ReactNode;
}

const toneClasses = {
  success: 'border-success/50 text-success',
  warning: 'border-warning/50 text-warning',
  danger: 'border-danger/50 text-danger',
  neutral: 'border-border text-text-secondary',
  gold: 'border-accent-gold/60 text-accent-gold'
};

export function StatusPill({ tone, children }: StatusPillProps): ReactNode {
  return <span className={'inline-flex min-h-8 items-center border bg-background-primary px-3 font-mono text-[11px] uppercase tracking-[0.14em] ' + toneClasses[tone]}>{children}</span>;
}
