// Governed by .rules v1.0
'use client';

import { useId, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminDisclosure } from '@/components/dashboard/admin-ui';
import { OVERVIEW_SALES_COPY as C } from '@/constants/overview-copy';
import { formatPrecisePrice } from '@/lib/utils';
import type { AdminSalesTrendDto } from '@/types/dto.types';

export const salesMetrics = ['totalRevenue', 'paidValue', 'pendingCod', 'unitsSold'] as const;
export type SalesMetric = (typeof salesMetrics)[number];

const color: Record<SalesMetric, string> = {
  totalRevenue: 'var(--overview-revenue)',
  paidValue: 'var(--overview-paid)',
  pendingCod: 'var(--overview-cod)',
  unitsSold: 'var(--overview-units)',
};
const shortDay = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortMonth = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const compactNumber = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('en-IN');
const formatPeriod = (period: string): string => period.includes(':') ? period
  : period.length === 7 ? shortMonth.format(new Date(period + '-01T00:00:00Z'))
    : shortDay.format(new Date(period + 'T00:00:00Z'));

export function formatSalesMetric(key: SalesMetric, value: number): string {
  return key === 'unitsSold' ? number.format(value) : formatPrecisePrice(value);
}

interface SalesTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
}
function SalesTooltip({ active, label, payload }: SalesTooltipProps): ReactNode {
  if (!active || !label || !payload?.length) return null;
  return <div className="border border-border bg-background-elevated p-3 text-xs text-text-primary shadow-lg">
    <p className="mb-2 font-semibold">{formatPeriod(label)}</p>
    {salesMetrics.map(key => {
      const match = payload.find(entry => entry.dataKey === key);
      if (!match) return null;
      return <p key={key} className="flex justify-between gap-5 py-0.5 text-text-secondary">
        <span>{C.metrics[key].label}</span>
        <strong className="text-text-primary">{formatSalesMetric(key, match?.value ?? 0)}</strong>
      </p>;
    })}
  </div>;
}

export interface AnalyticsChartProps {
  trend: AdminSalesTrendDto;
  rangeLabel: string;
}
export function AnalyticsChart({ trend, rangeLabel }: AnalyticsChartProps): ReactNode {
  const gradientId = useId();
  const animate = !useReducedMotion();
  const [hidden, setHidden] = useState<SalesMetric[]>([]);
  const toggle = (metric: SalesMetric) => setHidden(current =>
    current.includes(metric) ? current.filter(key => key !== metric) :
      current.length < salesMetrics.length - 1 ? [...current, metric] : current
  );
  const singlePeriod = trend.points.length === 1;
  const hasSales = trend.points.some(point => salesMetrics.some(key => point[key] !== 0));

  return <section className="overview-sales-panel grid min-w-0 gap-4 border border-border p-4 sm:p-5" aria-labelledby="overview-sales-trend">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="overview-sales-trend" className="text-base font-semibold">{C.trend}</h3>
        <p className="mt-1 text-xs text-text-secondary">{C.caption}</p>
      </div>
      <p className="border border-border px-2 py-1 font-mono text-xs text-text-secondary">{rangeLabel} · {C.granularity[trend.granularity]}</p>
    </div>
    {hasSales ? <>
    <ul aria-label={C.series} className="overview-chart-legend">
      {salesMetrics.map(key => <li key={key}>
        <button type="button" aria-pressed={!hidden.includes(key)}
          disabled={hidden.length === salesMetrics.length - 1 && !hidden.includes(key)}
          onClick={() => toggle(key)}>
          <span className="overview-legend-mark" data-metric={key} aria-hidden="true" />
          {C.metrics[key].label}
        </button>
      </li>)}
    </ul>
    <div className="h-64 min-w-0 sm:h-80">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart data={trend.points} accessibilityLayer margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color.totalRevenue} stopOpacity={0.26} />
              <stop offset="100%" stopColor={color.totalRevenue} stopOpacity={0.025} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border-default)" strokeDasharray="3 5" />
          <XAxis dataKey="period" tickFormatter={formatPeriod} stroke="var(--text-muted)" tick={{ fontSize: 11 }} minTickGap={18} />
          <YAxis yAxisId="money" includeHidden width={52} stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={value => '₹' + compactNumber.format(value)} />
          <YAxis yAxisId="units" includeHidden orientation="right" width={30} stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={value => compactNumber.format(value)} allowDecimals={false} domain={[0, 'auto']} />
          <Tooltip content={<SalesTooltip />} />
          <Bar yAxisId="units" dataKey="unitsSold" fill={color.unitsSold} fillOpacity={0.65} radius={[4, 4, 0, 0]} maxBarSize={24} hide={hidden.includes('unitsSold')} isAnimationActive={animate} animationDuration={450} />
          <Area yAxisId="money" type="monotone" dataKey="totalRevenue" stroke={color.totalRevenue} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={singlePeriod} hide={hidden.includes('totalRevenue')} isAnimationActive={animate} animationDuration={520} animationEasing="ease-out" />
          <Line yAxisId="money" type="monotone" dataKey="paidValue" stroke={color.paidValue} strokeWidth={2} strokeDasharray="6 3" dot={singlePeriod} hide={hidden.includes('paidValue')} isAnimationActive={animate} animationDuration={520} animationEasing="ease-out" />
          <Line yAxisId="money" type="monotone" dataKey="pendingCod" stroke={color.pendingCod} strokeWidth={2} strokeDasharray="2 4" dot={singlePeriod} hide={hidden.includes('pendingCod')} isAnimationActive={animate} animationDuration={520} animationEasing="ease-out" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </> : <p className="workspace-empty-state overview-chart-empty">{C.empty}</p>}
    <AdminDisclosure label={C.table}>
      <div className="max-h-64 overflow-auto">
        <table className="w-full min-w-[30rem] text-left text-xs text-text-secondary">
          <thead><tr><th className="p-2" scope="col">{C.period}</th>{salesMetrics.map(key => <th key={key} className="p-2" scope="col">{C.metrics[key].label}</th>)}</tr></thead>
          <tbody>{trend.points.map(point => <tr key={point.period} className="border-t border-border">
            <th scope="row" className="p-2 font-medium">{formatPeriod(point.period)}</th>
            {salesMetrics.map(key => <td key={key} className="whitespace-nowrap p-2 font-mono">{formatSalesMetric(key, point[key])}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </AdminDisclosure>
  </section>;
}
