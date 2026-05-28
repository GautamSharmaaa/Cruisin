// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps { variant?: 'new' | 'sale' | 'soldOut' | 'muted'; children: ReactNode; className?: string; }

export function Badge({ variant = 'muted', children, className }: BadgeProps): ReactNode {
  const variants = { new: 'bg-accent-white text-text-inverse', sale: 'bg-accent-gold text-text-inverse', soldOut: 'bg-background-overlay text-text-muted', muted: 'border border-border text-text-secondary' };
  return <span className={cn('inline-flex px-2 py-0.5 font-accent text-xs uppercase tracking-[0.15em]', variants[variant], className)}>{children}</span>;
}
