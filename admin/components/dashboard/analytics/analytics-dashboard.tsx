// Governed by .rules v1.0
'use client';

import { CalendarDays, Download, RefreshCw, Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useAdminAnalyticsSummary } from '@/hooks/useAdminResources';
import { exportToCsv, type CsvRow } from '@/lib/export-csv';
import { cn, formatPrice } from '@/lib/utils';
import type { AdminAnalyticsSummaryDto } from '@/types/dto.types';

const palette = {
  gold: '#c8a97e',
  blue: '#5b7cfa',
  cyan: '#22d3ee',
  green: '#34d399',
  red: '#ef4444',
  amber: '#f59e0b',
  grid: '#262626',
  muted: '#9a9a9a'
};

const presetOptions = [
  { label: 'Full 60 days', value: 'full60' },
  { label: 'Last 30 days', value: 'last30' },
  { label: 'Previous 30 days', value: 'previous30' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'Sale week', value: 'saleWeek' },
  { label: 'Custom', value: 'custom' }
] as const;

type PresetValue = (typeof presetOptions)[number]['value'];

interface Metric {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger' | 'info' | 'gold';
}

interface TableData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

function AnalyticsTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number | string; color?: string }> }): ReactNode {
  if (!active || !payload?.length) return null;
  return <div className="min-w-44 border border-border bg-background-overlay p-3 text-xs shadow-lg"><p className="font-mono text-accent-gold">{label}</p>{payload.map((item) => <p key={item.name ?? String(item.value)} className="mt-2 flex items-center justify-between gap-4 text-text-secondary"><span className="inline-flex items-center gap-2"><span className="h-2 w-2" style={{ backgroundColor: item.color ?? palette.gold }} />{item.name}</span><span className="font-mono text-text-primary">{typeof item.value === 'number' && String(item.name).toLowerCase().includes('revenue') ? formatPrice(item.value) : item.value}</span></p>)}</div>;
}

function MetricCard({ metric }: { metric: Metric }): ReactNode {
  const toneClass = {
    neutral: 'text-text-primary',
    success: 'text-[#34d399]',
    danger: 'text-[#ef4444]',
    info: 'text-[#5b7cfa]',
    gold: 'text-accent-gold'
  }[metric.tone ?? 'neutral'];
  return <article className="min-h-28 border border-border bg-background-elevated p-5 shadow-lg"><p className="text-xs uppercase text-text-secondary">{metric.label}</p><p className={cn('mt-4 break-words font-mono text-2xl', toneClass)}>{metric.value}</p></article>;
}

function ChartShell({ title, children, rows }: { title: string; children: ReactNode; rows: CsvRow[] }): ReactNode {
  return <section className="min-w-0 overflow-hidden border border-border bg-background-elevated shadow-lg"><div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="inline-flex min-w-0 items-center gap-2"><Table2 size={16} className="text-accent-gold" /><h2 className="break-words font-display text-xl text-text-primary">{title}</h2></div><button type="button" title={'Download ' + title} aria-label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)} className="inline-flex h-9 w-9 items-center justify-center border border-border text-text-secondary transition hover:text-accent-gold"><Download size={16} /></button></div><div className="min-w-0 p-4">{children}</div></section>;
}

function DataTable({ title, table, currencyColumns = [] }: { title: string; table: TableData; currencyColumns?: string[] }): ReactNode {
  const rows = [table.columns, ...table.rows];
  const formatCell = (column: string, cell: string | number): string | number => currencyColumns.includes(column) && typeof cell === 'number' ? formatPrice(cell) : cell;
  return <ChartShell title={title} rows={rows}>{table.rows.length === 0 ? <div className="flex min-h-36 items-center justify-center border border-dashed border-border text-sm text-text-secondary">{COPY.common.empty}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-background-overlay text-xs uppercase text-text-secondary"><tr>{table.columns.map((column) => <th key={column} className="border-b border-border p-4">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={String(row[0]) + rowIndex} className="border-b border-border-subtle transition hover:bg-background-primary/70">{row.map((cell, index) => <td key={table.columns[index]} className="p-4 text-text-secondary">{formatCell(table.columns[index], cell)}</td>)}</tr>)}</tbody></table></div>}</ChartShell>;
}

function statusRows(values: Record<string, number>): TableData {
  return {
    columns: ['Status', 'Orders'],
    rows: Object.entries(values).sort(([left], [right]) => left.localeCompare(right)).map(([status, count]) => [status, count])
  };
}

function exportRows(data: AdminAnalyticsSummaryDto): CsvRow[] {
  return [
    { Metric: 'Net revenue', Value: data.summary.netRevenue },
    { Metric: 'Gross revenue', Value: data.summary.grossRevenue },
    { Metric: 'Orders', Value: data.summary.totalOrders },
    { Metric: 'Paid orders', Value: data.summary.paidOrders },
    { Metric: 'AOV', Value: data.summary.averageOrderValue },
    {},
    ['Day', 'Gross Revenue', 'Net Revenue', 'Orders', 'Paid Orders'],
    ...data.revenueByDay.map((row) => [row.day, row.grossRevenue, row.netRevenue, row.orders, row.paidOrders])
  ];
}

function buildTables(data: AdminAnalyticsSummaryDto): {
  productTable: TableData;
  categoryTable: TableData;
  collectionTable: TableData;
  couponTable: TableData;
} {
  return {
    productTable: {
      columns: ['Product', 'SKU', 'Quantity', 'Orders', 'Revenue'],
      rows: data.topProducts.map((product) => [product.title, product.sku, product.quantity, product.orders, product.revenue])
    },
    categoryTable: {
      columns: ['Category', 'Quantity', 'Orders', 'Revenue'],
      rows: data.topCategories.map((category) => [category.name, category.quantity, category.orders, category.revenue])
    },
    collectionTable: {
      columns: ['Collection', 'Quantity', 'Orders', 'Revenue'],
      rows: data.topCollections.map((collection) => [collection.title, collection.quantity, collection.orders, collection.revenue])
    },
    couponTable: {
      columns: ['Coupon', 'Orders', 'Discount', 'Revenue'],
      rows: data.coupons.map((coupon) => [coupon.code, coupon.orders, coupon.discount, coupon.revenue])
    }
  };
}

export function AnalyticsDashboard(): ReactNode {
  const [preset, setPreset] = useState<PresetValue>('full60');
  const [customStart, setCustomStart] = useState('2026-05-04');
  const [customEnd, setCustomEnd] = useState('2026-07-02');
  const [batchId, setBatchId] = useState('');
  const batchParam = batchId.trim() ? { analyticsTestBatchId: batchId.trim() } : {};
  const params = preset === 'custom' ? { startDate: customStart, endDate: customEnd, ...batchParam } : { preset, ...batchParam };
  const analytics = useAdminAnalyticsSummary(params);
  const data = analytics.data;
  const tables = useMemo(() => data ? buildTables(data) : null, [data]);
  const metrics: Metric[] = data ? [
    { label: 'Net revenue', value: formatPrice(data.summary.netRevenue), tone: 'gold' },
    { label: 'Gross revenue', value: formatPrice(data.summary.grossRevenue), tone: 'info' },
    { label: 'Total orders', value: String(data.summary.totalOrders), tone: 'neutral' },
    { label: 'Paid orders', value: String(data.summary.paidOrders), tone: 'success' },
    { label: 'AOV', value: formatPrice(data.summary.averageOrderValue), tone: 'gold' },
    { label: 'Discounts', value: formatPrice(data.summary.discounts), tone: 'danger' },
    { label: 'Customers', value: String(data.summary.customers), tone: 'neutral' },
    { label: 'Returning customers', value: String(data.summary.returningCustomers), tone: 'success' },
    { label: 'Cancelled', value: String(data.summary.cancelledOrders), tone: 'danger' },
    { label: 'Refunded', value: String(data.summary.refundedOrders), tone: 'danger' }
  ] : [];

  return <section className="grid min-w-0 gap-6"><header className="grid min-w-0 gap-4 overflow-hidden border border-border bg-background-elevated p-5 shadow-lg lg:grid-cols-[1fr_auto] lg:items-end"><div className="min-w-0"><p className="font-mono text-[11px] uppercase text-accent-gold">{COPY.brand.eyebrow}</p><h1 className="mt-3 break-words font-display text-3xl text-text-primary lg:text-4xl">Analytics</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">Real admin analytics from orders, products, categories, collections, coupons, customers, and payment status.</p></div>{data ? <Button variant="secondary" onClick={() => exportToCsv('analytics-summary.csv', exportRows(data))} className="gap-2"><Download size={16} />Export CSV</Button> : null}</header>
    <section className="grid gap-4 border border-border bg-background-elevated p-4 shadow-lg xl:grid-cols-[1fr_auto] xl:items-end"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{presetOptions.map((option) => <button key={option.value} type="button" onClick={() => setPreset(option.value)} className={cn('min-h-11 border px-4 text-sm transition', preset === option.value ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border text-text-secondary hover:text-text-primary')}>{option.label}</button>)}</div><div className="grid gap-3 sm:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_220px_auto]"><label className="relative min-w-0"><span className="sr-only">Start date</span><input type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); setPreset('custom'); }} className="h-11 w-full border border-border bg-background-primary px-4 pr-10 text-sm text-text-primary focus:border-accent-gold focus:outline-none" /><CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" /></label><label className="relative min-w-0"><span className="sr-only">End date</span><input type="date" value={customEnd} onChange={(event) => { setCustomEnd(event.target.value); setPreset('custom'); }} className="h-11 w-full border border-border bg-background-primary px-4 pr-10 text-sm text-text-primary focus:border-accent-gold focus:outline-none" /><CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" /></label><label className="min-w-0"><span className="sr-only">Analytics test batch ID</span><input value={batchId} onChange={(event) => setBatchId(event.target.value)} placeholder="Batch ID filter" className="h-11 w-full border border-border bg-background-primary px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none" /></label><Button variant="secondary" aria-label="Refresh analytics" onClick={() => void analytics.refetch()} className="gap-2"><RefreshCw size={16} />Refresh</Button></div></section>
    {analytics.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }, (_unused, index) => <div key={index} className="h-28 animate-pulse border border-border bg-background-elevated" />)}</div> : null}
    {analytics.error ? <div className="border border-danger/60 bg-background-elevated p-6"><p className="font-display text-xl text-text-primary">{COPY.common.error}</p><p className="mt-2 text-sm text-text-secondary">{analytics.error.message}</p><Button className="mt-5" onClick={() => void analytics.refetch()}>{COPY.common.retry}</Button></div> : null}
    {data && tables ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]"><ChartShell title="Revenue And Orders Trend" rows={[['Day', 'Gross Revenue', 'Net Revenue', 'Orders', 'Paid Orders'], ...data.revenueByDay.map((row) => [row.day, row.grossRevenue, row.netRevenue, row.orders, row.paidOrders])]}><div className="h-96"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.revenueByDay} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="day" stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} /><YAxis yAxisId="revenue" stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={(value) => value === 0 ? '0' : formatPrice(Number(value) / 1000) + 'K'} /><YAxis yAxisId="orders" orientation="right" stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} /><Tooltip content={<AnalyticsTooltip />} /><Area yAxisId="revenue" type="monotone" dataKey="netRevenue" name="Net Revenue" stroke={palette.gold} fill={palette.gold} fillOpacity={0.22} /><Area yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke={palette.blue} fill={palette.blue} fillOpacity={0.12} /></AreaChart></ResponsiveContainer></div></ChartShell><ChartShell title="Payment Status" rows={statusRows(data.paymentStatus).rows}><div className="h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data.paymentStatus).map(([label, value]) => ({ label, value }))} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="label" stroke={palette.muted} /><YAxis stroke={palette.muted} allowDecimals={false} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Orders" fill={palette.cyan} /></BarChart></ResponsiveContainer></div></ChartShell></div><div className="grid gap-6 xl:grid-cols-2"><DataTable title="Top Products" table={tables.productTable} currencyColumns={['Revenue']} /><DataTable title="Top Categories" table={tables.categoryTable} currencyColumns={['Revenue']} /><DataTable title="Top Collections" table={tables.collectionTable} currencyColumns={['Revenue']} /><DataTable title="Coupon Performance" table={tables.couponTable} currencyColumns={['Discount', 'Revenue']} /><DataTable title="Order Status" table={statusRows(data.ordersByStatus)} /><DataTable title="Payment Status Table" table={statusRows(data.paymentStatus)} /></div><p className="text-xs text-text-secondary">Range {data.range.startDate} to {data.range.endDate}, timezone {data.range.timezone}. Generated {new Date(data.generatedAt).toLocaleString('en-IN')}.</p></> : null}
  </section>;
}
