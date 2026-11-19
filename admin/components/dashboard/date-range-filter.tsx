// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';

export const dateRangeOptions = ['all', 'today', 'week', 'month', 'quarter', 'year'] as const;
export type DateRange = (typeof dateRangeOptions)[number];

const labels: Record<DateRange, string> = { all: 'All time', today: 'Today', week: 'This week', month: 'This month', quarter: 'This quarter', year: 'This year' };
const istOffset = 330 * 60_000;

export const dateRangeStart = (range: DateRange, now = new Date()): Date | undefined => {
  if (range === 'all') return undefined;
  const date = new Date(now.getTime() + istOffset);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const monday = day - ((date.getUTCDay() + 6) % 7);
  const boundaries = {
    today: Date.UTC(year, month, day),
    week: Date.UTC(year, month, monday),
    month: Date.UTC(year, month, 1),
    quarter: Date.UTC(year, Math.floor(month / 3) * 3, 1),
    year: Date.UTC(year, 0, 1)
  };
  return new Date(boundaries[range] - istOffset);
};

export const isInDateRange = (value: string | Date | undefined, range: DateRange, now = new Date()): boolean => {
  if (range === 'all') return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = dateRangeStart(range, now);
  return Boolean(start && date >= start && date <= now);
};

export function DateRangeFilter({ value, onChange, label = 'Date range' }: { value: DateRange; onChange: (value: DateRange) => void; label?: string }): ReactNode {
  return <div className="flex flex-wrap gap-2" role="group" aria-label={label}>{dateRangeOptions.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={(value === option ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary') + ' min-h-11 border px-3 text-xs uppercase tracking-[0.08em] transition'}>{labels[option]}</button>)}</div>;
}
