// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface ActiveFiltersProps { filters: string[]; onClear: (filter: string) => void; }
export function ActiveFilters({ filters, onClear }: ActiveFiltersProps): ReactNode { return <div className="flex flex-wrap gap-2">{filters.map((filter) => <button key={filter} onClick={() => onClear(filter)} className="min-h-11 border border-border px-3 font-body text-xs uppercase tracking-[0.12em] text-text-secondary">{filter} ×</button>)}</div>; }
