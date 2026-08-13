// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';

export const dateRangeOptions = ['all', 'today', 'week', 'month', 'quarter', 'year'] as const;
export type DateRange = (typeof dateRangeOptions)[number];

const labels: Record<DateRange, string> = { all: 'All time', today: 'Today', week: 'This week', month: 'This month', quarter: 'This quarter', year: 'This year' };
const startOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isInDateRange = (value: string | Date | undefined, range: DateRange, now = new Date()): boolean => {
  if (range === 'all') return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = startOfDay(now);
  if (range === 'today') return date >= today;
  if (range === 'week') { const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); return date >= start; }
  if (range === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  if (range === 'quarter') return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
  return date.getFullYear() === now.getFullYear();
};

export function DateRangeFilter({ value, onChange, label = 'Date range' }: { value: DateRange; onChange: (value: DateRange) => void; label?: string }): ReactNode {
  return <div className="flex flex-wrap gap-2" role="group" aria-label={label}>{dateRangeOptions.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={(value === option ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary') + ' min-h-11 border px-3 text-xs uppercase tracking-[0.08em] transition'}>{labels[option]}</button>)}</div>;
}
