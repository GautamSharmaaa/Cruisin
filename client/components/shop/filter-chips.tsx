// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterChip {
  label: string;
  value: string;
  kind: 'category' | 'tag' | 'clear';
}

export interface FilterChipsProps {
  chips: FilterChip[];
  activeValue?: string;
  onSelect: (chip: FilterChip) => void;
}

export function FilterChips({ chips, activeValue, onSelect }: FilterChipsProps): ReactNode {
  return <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{chips.map((chip) => { const active = chip.value === activeValue || (chip.kind === 'clear' && !activeValue); return <button key={chip.kind + chip.value} type="button" onClick={() => onSelect(chip)} className={cn('h-10 shrink-0 border px-4 text-xs uppercase tracking-[0.12em] transition', active ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary')}>{chip.label}</button>; })}</div>;
}
