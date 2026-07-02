// Governed by .rules v1.0
'use client';

import { Grid2X2, Rows3, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GridView } from '@/components/shop/product-grid';

export interface GridViewToggleProps {
  value: GridView;
  onChange: (value: GridView) => void;
}

const options: Array<{ value: GridView; label: string; icon: typeof Grid2X2 }> = [
  { value: 4, label: '4-grid', icon: Grid2X2 },
  { value: 2, label: '2-grid', icon: Rows3 },
  { value: 1, label: '1-grid', icon: Square }
];

export function GridViewToggle({ value, onChange }: GridViewToggleProps): ReactNode {
  return <div className="inline-flex border border-border bg-background-primary" aria-label="Grid view controls">{options.map((option) => { const Icon = option.icon; const active = value === option.value; return <button key={option.value} type="button" title={option.label} aria-label={option.label} aria-pressed={active} onClick={() => onChange(option.value)} className={cn('grid h-11 w-11 place-items-center border-r border-border text-text-secondary transition last:border-r-0 hover:text-text-primary', active && 'bg-background-elevated text-accent-gold')}><Icon size={16} /></button>; })}</div>;
}
