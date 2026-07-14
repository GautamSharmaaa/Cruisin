// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { swatchBackground } from '@/lib/variant-utils';

export interface ColorSwatchProps { color: string; colorHex: string; active: boolean; soldOut?: boolean; onSelect: () => void; }

export function ColorSwatch({ color, colorHex, active, soldOut = false, onSelect }: ColorSwatchProps): ReactNode {
  const background = swatchBackground(colorHex);
  const label = soldOut ? `${color} — sold out` : color;
  return <button type="button" onClick={onSelect} disabled={soldOut} aria-label={label} aria-pressed={active} title={label} className={'relative flex min-h-11 min-w-11 items-center border px-3 text-xs uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ' + (active ? 'border-accent-gold text-text-primary shadow-gold' : 'border-border text-text-secondary hover:border-border-strong') + (soldOut ? ' cursor-not-allowed opacity-55 after:absolute after:left-2 after:right-2 after:top-1/2 after:h-px after:-rotate-12 after:bg-text-muted' : '')}>
    <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 shrink-0 rounded-full border border-border-strong shadow-inner" style={{ background }} />
    <span className="max-w-36 text-left leading-4">{color}</span>
  </button>;
}
