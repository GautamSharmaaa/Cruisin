// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface ColorSwatchProps { color: string; colorHex: string; active: boolean; onSelect: () => void; }
const swatchClass = (color: string): string => {
  if (color === 'Black') return 'bg-background-primary';
  if (color === 'Carbon') return 'bg-background-input';
  if (color === 'Ash') return 'bg-text-secondary';
  if (color === 'Obsidian') return 'bg-background-elevated';
  return 'bg-accent-gold';
};
export function ColorSwatch({ color, active, onSelect }: ColorSwatchProps): ReactNode { return <button onClick={onSelect} aria-label={color} className={'h-11 min-w-11 border px-3 text-xs uppercase tracking-[0.12em] ' + (active ? 'border-accent-gold text-text-primary' : 'border-border text-text-secondary')}><span className={'mr-2 inline-block h-3 w-3 border border-border-strong align-middle ' + swatchClass(color)} />{color}</button>; }
