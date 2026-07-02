// Governed by .rules v1.0
'use client';

import { Flashlight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FlashlightToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function FlashlightToggle({ active, onToggle }: FlashlightToggleProps): ReactNode {
  return <button type="button" title="Spotlight" aria-label="Toggle spotlight mode" aria-pressed={active} onClick={onToggle} className={cn('grid h-11 w-11 place-items-center border border-border bg-background-primary text-text-secondary transition hover:border-border-strong hover:text-text-primary', active && 'border-accent-gold text-accent-gold shadow-gold')}><Flashlight size={16} /></button>;
}
