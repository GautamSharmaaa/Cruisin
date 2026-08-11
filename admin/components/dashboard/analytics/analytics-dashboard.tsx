// Governed by .rules v1.0
'use client';

import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, PackageSearch, RefreshCw, Table2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useAdminAnalyticsSummary, useAdminMe } from '@/hooks/useAdminResources';
import { exportToCsv, type CsvRow } from '@/lib/export-csv';
import { cn, formatPrice } from '@/lib/utils';
import type { AdminAnalyticsSummaryDto } from '@/types/dto.types';

const palette = { gold: '#c8a97e', blue: '#5b7cfa', cyan: '#22d3ee', green: '#34d399', red: '#ef4444', grid: '#262626', muted: '#9a9a9a' };
const presetOptions = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: 'last7' },
  { label: '30 days', value: 'last30' },
  { label: '90 days', value: 'last90' },
  { label: 'Custom', value: 'custom' }
] as const;
type PresetValue = (typeof presetOptions)[number]['value'];

interface Metric {
  label: string;
  value: number;
  previous: number;
  format: 'currency' | 'number';
  description: string;
  inverse?: boolean;
}

interface TableData { columns: string[]; rows: Array<Array<string | number>>; }

const dateInIst = (date: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const daysAgo = (days: number): string => dateInIst(new Date(Date.now() - days * 86_400_000));
const metricValue = (metric: Metric): string => metric.format === 'currency' ? formatPrice(metric.value) : metric.value.toLocaleString('en-IN');
const metricDifference = (metric: Metric): string => metric.format === 'currency' ? formatPrice(Math.abs(metric.value - metric.previous)) : Math.abs(metric.value - metric.previous).toLocaleString('en-IN');

function AnalyticsTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number | string; color?: string }> }): ReactNode {
  if (!active || !payload?.length) return null;
  return <div className="min-w-44 border border-border bg-background-overlay p-3 text-xs shadow-lg"><p className="font-mono text-accent-gold">{label}</p>{payload.map((item) => <p key={item.name ?? String(item.value)} className="mt-2 flex items-center justify-between gap-4 text-text-secondary"><span className="inline-flex items-center gap-2"><span className="h-2 w-2" style={{ backgroundColor: item.color ?? palette.gold }} />{item.name}</span><span className="font-mono text-text-primary">{typeof item.value === 'number' && /(revenue|refund|discount|collected|due|outstanding|amount)/i.test(String(item.name)) ? formatPrice(item.value) : item.value}</span></p>)}</div>;
}

function MetricCard({ metric }: { metric: Metric }): ReactNode {
  const difference = metric.value - metric.previous;
  const percentage = metric.previous === 0 ? null : (difference / Math.abs(metric.previous)) * 100;
  const positive = metric.inverse ? difference < 0 : difference > 0;
  const negative = metric.inverse ? difference > 0 : difference < 0;
  return <article title={metric.description} className="min-h-36 min-w-0 border border-border bg-background-elevated p-5 shadow-lg" aria-label={`${metric.label}: ${metricValue(metric)}. ${metric.description}`}><div className="flex items-start justify-between gap-3"><p className="text-xs uppercase tracking-[0.08em] text-text-secondary">{metric.label}</p><span className="cursor-help font-mono text-xs text-text-muted" aria-hidden="true">?</span></div><p className="mt-4 truncate font-mono text-2xl text-text-primary" title={metricValue(metric)}>{metricValue(metric)}</p><div className={cn('mt-4 flex flex-wrap items-center gap-2 text-xs', positive && 'text-[#34d399]', negative && 'text-[#ef4444]', !positive && !negative && 'text-text-muted')}>{positive ? <ArrowUpRight size={14} /> : negative ? <ArrowDownRight size={14} /> : null}<span>{percentage === null ? 'No prior baseline' : `${Math.abs(percentage).toFixed(1)}%`}</span><span className="text-text-muted">· {metricDifference(metric)} vs prior</span></div></article>;
}

function ChartShell({ title, children, rows, summary }: { title: string; children: ReactNode; rows: CsvRow[]; summary: string }): ReactNode {
  return <section className="w-full max-w-full min-w-0 overflow-hidden border border-border bg-background-elevated shadow-lg"><div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="inline-flex min-w-0 items-center gap-2"><Table2 size={16} className="text-accent-gold" /><h2 className="break-words font-display text-xl text-text-primary">{title}</h2></div><button type="button" title={'Download ' + title} aria-label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)} className="inline-flex h-10 w-10 items-center justify-center border border-border text-text-secondary transition hover:border-accent-gold hover:text-accent-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold"><Download size={16} /></button></div><p className="sr-only">{summary}</p><div className="w-full max-w-full min-w-0 overflow-hidden p-4">{children}</div></section>;
}

function DataTable({ title, table, summary, currencyColumns = [] }: { title: string; table: TableData; summary: string; currencyColumns?: string[] }): ReactNode {
  const rows = [table.columns, ...table.rows];
  const formatCell = (column: string, cell: string | number): string | number => currencyColumns.includes(column) && typeof cell === 'number' ? formatPrice(cell) : cell;
  return <ChartShell title={title} rows={rows} summary={summary}>{table.rows.length === 0 ? <div className="flex min-h-36 items-center justify-center border border-dashed border-border text-sm text-text-secondary">No data for this period.</div> : <div className="w-full max-w-full overflow-x-auto" tabIndex={0} aria-label={`${title} table; scroll horizontally`}><table className="w-max min-w-[680px] border-collapse text-left text-sm"><thead className="bg-background-overlay text-xs uppercase text-text-secondary"><tr>{table.columns.map((column) => <th key={column} className="border-b border-border p-4">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={String(row[0]) + rowIndex} className="border-b border-border-subtle transition hover:bg-background-primary/70">{row.map((cell, index) => <td key={table.columns[index]} className="p-4 text-text-secondary">{formatCell(table.columns[index], cell)}</td>)}</tr>)}</tbody></table></div>}</ChartShell>;
}

const statusRows = (values: Record<string, number>): TableData => ({ columns: ['Status', 'Orders'], rows: Object.entries(values).sort(([left], [right]) => left.localeCompare(right)).map(([status, count]) => [status.replaceAll('_', ' '), count]) });

function exportRows(data: AdminAnalyticsSummaryDto): CsvRow[] {
  return [
    { Metric: 'Net revenue', Value: data.summary.netRevenue, Previous: data.comparison.summary.netRevenue },
    { Metric: 'Gross revenue', Value: data.summary.grossRevenue, Previous: data.comparison.summary.grossRevenue },
    { Metric: 'Orders', Value: data.summary.totalOrders, Previous: data.comparison.summary.totalOrders },
    { Metric: 'Paid orders', Value: data.summary.paidOrders, Previous: data.comparison.summary.paidOrders },
    { Metric: 'AOV', Value: data.summary.averageOrderValue, Previous: data.comparison.summary.averageOrderValue },
    { Metric: 'Units sold', Value: data.summary.unitsSold, Previous: data.comparison.summary.unitsSold },
    { Metric: 'Refunds', Value: data.summary.refunds, Previous: data.comparison.summary.refunds },
    { Metric: 'Customers', Value: data.summary.customers, Previous: data.comparison.summary.customers },
    {},
    ['Day', 'Gross Revenue', 'Net Revenue', 'Discounts', 'Refunds', 'Orders', 'Paid Orders'],
    ...data.revenueByDay.map((row) => [row.day, row.grossRevenue, row.netRevenue, row.discounts, row.refunds, row.orders, row.paidOrders])
  ];
}

function buildTables(data: AdminAnalyticsSummaryDto): { productTable: TableData; categoryTable: TableData; couponTable: TableData } {
  return {
    productTable: { columns: ['Product', 'SKU', 'Quantity', 'Orders', 'Revenue'], rows: data.topProducts.map((product) => [product.title, product.sku, product.quantity, product.orders, product.revenue]) },
    categoryTable: { columns: ['Category', 'Quantity', 'Orders', 'Revenue'], rows: data.topCategories.map((category) => [category.name, category.quantity, category.orders, category.revenue]) },
    couponTable: { columns: ['Coupon', 'Orders', 'Discount', 'Revenue'], rows: data.coupons.map((coupon) => [coupon.code, coupon.orders, coupon.discount, coupon.revenue]) }
  };
}

function InventoryTable({ data }: { data: AdminAnalyticsSummaryDto['inventory'] }): ReactNode {
  return <section className="border border-border bg-background-elevated shadow-lg"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex items-center gap-2"><PackageSearch size={17} className="text-accent-gold" /><h2 className="font-display text-xl">Inventory attention</h2></div><p className="font-mono text-xs text-text-secondary">{data.outOfStock} out · {data.lowStock} low</p></header>{data.products.length === 0 ? <p className="p-8 text-sm text-text-secondary">No low-stock products.</p> : <div className="divide-y divide-border-subtle">{data.products.map((product) => <Link key={product.productId} href={`/products/${product.productId}`} className="grid gap-2 p-4 transition hover:bg-background-primary/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold sm:grid-cols-[1fr_auto_auto] sm:items-center"><span><span className="block text-sm text-text-primary">{product.title}</span><span className="mt-1 block font-mono text-xs text-text-muted">{product.productCode || 'No product code'}</span></span><span className="font-mono text-xs text-text-secondary">Stock {product.stock} / threshold {product.threshold}</span><span className={cn('text-xs uppercase', product.status === 'out_of_stock' ? 'text-[#ef4444]' : 'text-[#f59e0b]')}>{product.status.replaceAll('_', ' ')}</span></Link>)}</div>}</section>;
}

function RecentOrders({ orders }: { orders: AdminAnalyticsSummaryDto['recentOrders'] }): ReactNode {
  return <section className="w-full max-w-full min-w-0 overflow-hidden border border-border bg-background-elevated shadow-lg"><header className="border-b border-border p-4"><h2 className="font-display text-xl">Recent orders</h2><p className="mt-2 text-xs text-text-secondary">Highest recency within the selected period.</p></header>{orders.length === 0 ? <p className="p-8 text-sm text-text-secondary">No orders in this period.</p> : <div className="w-full max-w-full overflow-x-auto" tabIndex={0} aria-label="Recent orders table; scroll horizontally"><table className="w-max min-w-[820px] text-left text-sm"><thead className="bg-background-overlay text-xs uppercase text-text-secondary"><tr>{['Order', 'Customer', 'Date', 'Total', 'Mode', 'Payment', 'Status'].map((column) => <th key={column} className="p-4">{column}</th>)}</tr></thead><tbody>{orders.map((order) => <tr key={order.orderId} className="border-t border-border-subtle"><td className="p-4"><Link href={`/orders/${order.orderId}`} className="font-mono text-accent-gold hover:underline">{order.orderNumber}</Link></td><td className="p-4 text-text-secondary">{order.customer}</td><td className="p-4 text-text-secondary">{new Date(order.date).toLocaleDateString('en-IN')}</td><td className="p-4 font-mono">{formatPrice(order.total)}</td><td className="p-4 text-text-secondary">{order.paymentMode}</td><td className="p-4 text-text-secondary">{order.paymentStatus.replaceAll('_', ' ')}</td><td className="p-4 text-text-secondary">{order.orderStatus}</td></tr>)}</tbody></table></div>}</section>;
}

export function AnalyticsDashboard(): ReactNode {
  const [preset, setPreset] = useState<PresetValue>('last30');
  const [customStart, setCustomStart] = useState(daysAgo(29));
  const [customEnd, setCustomEnd] = useState(daysAgo(0));
  const [includeTestOrders, setIncludeTestOrders] = useState(false);
  const me = useAdminMe();
  const analytics = useAdminAnalyticsSummary(preset === 'custom' ? { startDate: customStart, endDate: customEnd, includeTestOrders } : { preset, includeTestOrders });
  const data = analytics.data;
  const tables = useMemo(() => data ? buildTables(data) : null, [data]);
  const trendData = useMemo(() => data ? data.revenueByDay.map((row, index) => ({ ...row, previousNetRevenue: data.comparison.revenueByDay[index]?.netRevenue ?? 0 })) : [], [data]);
  const metrics: Metric[] = data ? [
    { label: 'Net revenue', value: data.summary.netRevenue, previous: data.comparison.summary.netRevenue, format: 'currency', description: 'Collected revenue after recorded refunds.' },
    { label: 'Gross paid sales', value: data.summary.grossRevenue, previous: data.comparison.summary.grossRevenue, format: 'currency', description: 'Captured or settled customer payments before recorded refunds.' },
    { label: 'Orders', value: data.summary.totalOrders, previous: data.comparison.summary.totalOrders, format: 'number', description: 'Business orders excluding failed and abandoned unpaid payment attempts.' },
    { label: 'Paid orders', value: data.summary.paidOrders, previous: data.comparison.summary.paidOrders, format: 'number', description: 'Orders with captured or settled payment history.' },
    { label: 'Average order value', value: data.summary.averageOrderValue, previous: data.comparison.summary.averageOrderValue, format: 'currency', description: 'Gross paid sales divided by paid orders.' },
    { label: 'Units sold', value: data.summary.unitsSold, previous: data.comparison.summary.unitsSold, format: 'number', description: 'Item quantity from revenue-eligible orders.' },
    { label: 'Refunds', value: data.summary.refunds, previous: data.comparison.summary.refunds, format: 'currency', description: 'Recorded refund value in the selected period.', inverse: true },
    { label: 'Customers', value: data.summary.customers, previous: data.comparison.summary.customers, format: 'number', description: 'Unique customers placing orders in the selected period.' },
    { label: 'COD outstanding', value: data.outstanding.cod, previous: data.comparison.outstanding.cod, format: 'currency', description: 'Amount still due on COD orders in the selected period.', inverse: true },
    { label: 'Partial outstanding', value: data.outstanding.partial, previous: data.comparison.outstanding.partial, format: 'currency', description: 'Balance still due on partial-payment orders in the selected period.', inverse: true }
  ] : [];
  const repeatRate = data && data.summary.customers > 0 ? (data.summary.returningCustomers / data.summary.customers) * 100 : 0;
  const orderStatusData = data ? Object.entries(data.ordersByStatus).map(([label, value]) => ({ label: label.replaceAll('_', ' '), value })) : [];
  const paidDueData = data ? [{ label: 'Collected', value: data.summary.netRevenue }, { label: 'Due', value: data.outstanding.total }] : [];
  const customerData = data ? [{ label: 'New accounts', value: data.summary.newCustomers }, { label: 'Returning purchasers', value: data.summary.returningCustomers }] : [];
  const topRevenueData = data ? data.topProducts.slice(0, 6).map((product) => ({ title: product.title, value: product.revenue })) : [];
  const topUnitsData = data ? [...data.topProducts].sort((left, right) => right.quantity - left.quantity).slice(0, 6).map((product) => ({ title: product.title, value: product.quantity })) : [];

  return <section className="grid w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
    <header className="grid min-w-0 gap-4 overflow-hidden border border-border bg-background-elevated p-5 shadow-lg lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="min-w-0"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">{COPY.brand.eyebrow}</p><h1 className="mt-3 break-words font-display text-3xl text-text-primary lg:text-4xl">Analytics</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">Commerce intelligence from orders, payments, customers, products, inventory, discounts, and refunds—never demo values.</p>{data ? <p className="mt-3 font-mono text-xs text-text-muted">Updated {new Date(data.generatedAt).toLocaleString('en-IN')} · Asia/Kolkata</p> : null}</div>
      <div className="flex flex-wrap gap-3">{me.data?.role === 'superadmin' ? <label className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-xs text-text-secondary"><input type="checkbox" checked={includeTestOrders} onChange={(event) => setIncludeTestOrders(event.target.checked)} />Include test orders</label> : null}<Button variant="secondary" aria-label="Refresh analytics" onClick={() => void analytics.refetch()} className="gap-2"><RefreshCw size={16} />Refresh</Button>{data ? <Button variant="secondary" onClick={() => exportToCsv('analytics-summary.csv', exportRows(data))} className="gap-2"><Download size={16} />Export CSV</Button> : null}</div>
    </header>

    <section className="grid gap-4 border border-border bg-background-elevated p-4 shadow-lg xl:grid-cols-[1fr_auto] xl:items-end">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Analytics date presets">{presetOptions.map((option) => <button key={option.value} type="button" onClick={() => setPreset(option.value)} aria-pressed={preset === option.value} className={cn('min-h-11 border px-4 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold', preset === option.value ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border text-text-secondary hover:text-text-primary')}>{option.label}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="relative min-w-0"><span className="sr-only">Start date</span><input type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); setPreset('custom'); }} className="h-11 w-full border border-border bg-background-primary px-4 pr-10 text-sm text-text-primary focus:border-accent-gold focus:outline-none" /><CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" /></label><label className="relative min-w-0"><span className="sr-only">End date</span><input type="date" value={customEnd} onChange={(event) => { setCustomEnd(event.target.value); setPreset('custom'); }} className="h-11 w-full border border-border bg-background-primary px-4 pr-10 text-sm text-text-primary focus:border-accent-gold focus:outline-none" /><CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" /></label></div>
    </section>

    {analytics.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" role="status" aria-busy="true" aria-label="Loading analytics">{Array.from({ length: 10 }, (_unused, index) => <div key={index} className="h-36 animate-pulse border border-border bg-background-elevated" />)}</div> : null}
    {analytics.error ? <div className="border border-danger/60 bg-background-elevated p-6" role="alert"><p className="font-display text-xl text-text-primary">{COPY.common.error}</p><p className="mt-2 text-sm text-text-secondary">{analytics.error.message}</p><Button className="mt-5" onClick={() => void analytics.refetch()}>{COPY.common.retry}</Button></div> : null}

    {data && tables ? <>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">{[
        ['Today', data.summary.todayOrders], ['COD', data.summary.codOrders], ['Prepaid', data.summary.prepaidOrders], ['Pending', data.summary.pendingOrders], ['Processing', data.summary.processingOrders],
        ['Shipped', data.summary.shippedOrders], ['Delivered', data.summary.deliveredOrders], ['Cancelled', data.summary.cancelledOrders], ['Returns', data.summary.returnedOrders], ['RTO', data.summary.rtoOrders]
      ].map(([label, value]) => <article key={String(label)} className="bg-background-elevated p-4"><p className="text-xs uppercase text-text-muted">{label}</p><p className="mt-2 font-mono text-xl text-text-primary">{value}</p></article>)}</div>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <article className="border border-border bg-background-elevated p-5"><p className="text-xs uppercase text-text-secondary">Repeat purchase rate</p><p className="mt-4 font-mono text-2xl text-accent-gold">{repeatRate.toFixed(1)}%</p><p className="mt-2 text-xs text-text-muted">{data.summary.returningCustomers} returning purchasers</p></article>
        <article className="border border-border bg-background-elevated p-5"><p className="text-xs uppercase text-text-secondary">Discounts granted</p><p className="mt-4 font-mono text-2xl text-text-primary">{formatPrice(data.summary.discounts)}</p><p className="mt-2 text-xs text-text-muted">Across revenue-eligible orders</p></article>
        <article className="border border-border bg-background-elevated p-5"><p className="text-xs uppercase text-text-secondary">Refunded orders</p><p className="mt-4 font-mono text-2xl text-text-primary">{data.summary.refundedOrders.toLocaleString('en-IN')}</p><p className="mt-2 text-xs text-text-muted">Full and partial refund states</p></article>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <ChartShell title="Revenue trend" rows={[["Day", "Gross Revenue", "Net Revenue", "Orders", "Paid Orders"], ...data.revenueByDay.map((row) => [row.day, row.grossRevenue, row.netRevenue, row.orders, row.paidOrders])]} summary={`Gross revenue ${formatPrice(data.summary.grossRevenue)} and net revenue ${formatPrice(data.summary.netRevenue)} across ${data.summary.totalOrders} orders, compared with ${formatPrice(data.comparison.summary.netRevenue)} net in the previous equivalent period.`}><div className="h-96"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="day" stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} minTickGap={28} /><YAxis stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={(value) => value === 0 ? '0' : formatPrice(Number(value) / 1000) + 'K'} /><Tooltip content={<AnalyticsTooltip />} /><Legend /><Area type="monotone" dataKey="grossRevenue" name="Gross Revenue" stroke={palette.blue} fill={palette.blue} fillOpacity={0.06} /><Area type="monotone" dataKey="netRevenue" name="Net Revenue" stroke={palette.gold} fill={palette.gold} fillOpacity={0.18} /><Area type="monotone" dataKey="previousNetRevenue" name="Previous Net Revenue" stroke={palette.muted} fill="transparent" strokeDasharray="5 5" /></AreaChart></ResponsiveContainer></div></ChartShell>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <ChartShell title="Payment status" rows={statusRows(data.paymentStatus).rows} summary={`${data.summary.paidOrders} fully paid orders; ${data.summary.pendingOrders} pending; ${data.summary.refundedOrders} refunded.`}><div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data.paymentStatus).map(([label, value]) => ({ label: label.replaceAll('_', ' '), value }))}><XAxis dataKey="label" stroke={palette.muted} tickLine={false} tick={{ fontSize: 10 }} /><YAxis stroke={palette.muted} allowDecimals={false} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Orders" fill={palette.cyan} /></BarChart></ResponsiveContainer></div></ChartShell>
          <ChartShell title="Payment modes" rows={statusRows(data.paymentModes).rows} summary={Object.entries(data.paymentModes).map(([mode, count]) => `${mode}: ${count}`).join(', ') || 'No payment modes in this period.'}><div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data.paymentModes).map(([label, value]) => ({ label, value }))}><XAxis dataKey="label" stroke={palette.muted} /><YAxis stroke={palette.muted} allowDecimals={false} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Orders" fill={palette.blue} /></BarChart></ResponsiveContainer></div></ChartShell>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <ChartShell title="Order status breakdown" rows={statusRows(data.ordersByStatus).rows} summary={Object.entries(data.ordersByStatus).map(([status, count]) => `${status}: ${count}`).join(', ') || 'No orders.'}><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderStatusData} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid stroke={palette.grid} horizontal={false} /><XAxis type="number" stroke={palette.muted} allowDecimals={false} /><YAxis type="category" dataKey="label" width={96} stroke={palette.muted} tick={{ fontSize: 11 }} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Orders" fill={palette.gold} /></BarChart></ResponsiveContainer></div></ChartShell>
        <ChartShell title="Paid versus due" rows={[["Balance", "Amount"], ...paidDueData.map((row) => [row.label, row.value])]} summary={`${formatPrice(data.summary.netRevenue)} collected versus ${formatPrice(data.outstanding.total)} outstanding in the selected period.`}><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={paidDueData}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="label" stroke={palette.muted} /><YAxis stroke={palette.muted} tickFormatter={(value) => formatPrice(Number(value) / 1000) + 'K'} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Amount" fill={palette.green} /></BarChart></ResponsiveContainer></div></ChartShell>
        <ChartShell title="Customer cohorts" rows={[["Cohort", "Customers"], ...customerData.map((row) => [row.label, row.value])]} summary={`${data.summary.newCustomers} new accounts and ${data.summary.returningCustomers} returning purchasers. Cohorts may overlap when a new account orders more than once.`}><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={customerData}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="label" stroke={palette.muted} tick={{ fontSize: 11 }} /><YAxis stroke={palette.muted} allowDecimals={false} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Customers" fill={palette.cyan} /></BarChart></ResponsiveContainer></div></ChartShell>
        <ChartShell title="Refund and discount trend" rows={[["Day", "Refunds", "Discounts"], ...data.revenueByDay.map((row) => [row.day, row.refunds, row.discounts])]} summary={`${formatPrice(data.summary.refunds)} refunded and ${formatPrice(data.summary.discounts)} discounted across the selected period.`}><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.revenueByDay}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="day" stroke={palette.muted} minTickGap={28} /><YAxis stroke={palette.muted} tickFormatter={(value) => formatPrice(Number(value) / 1000) + 'K'} /><Tooltip content={<AnalyticsTooltip />} /><Legend /><Area type="monotone" dataKey="refunds" name="Refunds" stroke={palette.red} fill={palette.red} fillOpacity={0.14} /><Area type="monotone" dataKey="discounts" name="Discounts" stroke={palette.gold} fill={palette.gold} fillOpacity={0.14} /></AreaChart></ResponsiveContainer></div></ChartShell>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <ChartShell title="Top products by revenue" rows={[["Product", "Revenue"], ...topRevenueData.map((row) => [row.title, row.value])]} summary={`${topRevenueData.length} leading products ranked by attributed net revenue.`}><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={topRevenueData} layout="vertical" margin={{ left: 18, right: 18 }}><CartesianGrid stroke={palette.grid} horizontal={false} /><XAxis type="number" stroke={palette.muted} tickFormatter={(value) => formatPrice(Number(value) / 1000) + 'K'} /><YAxis type="category" dataKey="title" width={118} stroke={palette.muted} tick={{ fontSize: 10 }} tickFormatter={(value) => String(value).length > 18 ? String(value).slice(0, 17) + '…' : String(value)} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Revenue" fill={palette.gold} /></BarChart></ResponsiveContainer></div></ChartShell>
        <ChartShell title="Top products by units" rows={[["Product", "Units"], ...topUnitsData.map((row) => [row.title, row.value])]} summary={`${topUnitsData.length} leading products ranked by units sold.`}><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={topUnitsData} layout="vertical" margin={{ left: 18, right: 18 }}><CartesianGrid stroke={palette.grid} horizontal={false} /><XAxis type="number" stroke={palette.muted} allowDecimals={false} /><YAxis type="category" dataKey="title" width={118} stroke={palette.muted} tick={{ fontSize: 10 }} tickFormatter={(value) => String(value).length > 18 ? String(value).slice(0, 17) + '…' : String(value)} /><Tooltip content={<AnalyticsTooltip />} /><Bar dataKey="value" name="Units" fill={palette.blue} /></BarChart></ResponsiveContainer></div></ChartShell>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2"><DataTable title="Top products" table={tables.productTable} currencyColumns={['Revenue']} summary={`${data.topProducts.length} ranked products by attributed net revenue.`} /><DataTable title="Top categories" table={tables.categoryTable} currencyColumns={['Revenue']} summary={`${data.topCategories.length} ranked categories by attributed net revenue.`} /><DataTable title="Coupon performance" table={tables.couponTable} currencyColumns={['Discount', 'Revenue']} summary={`${formatPrice(data.summary.discounts)} total discount and ${formatPrice(data.summary.refunds)} recorded refunds.`} /><DataTable title="Order status" table={statusRows(data.ordersByStatus)} summary={Object.entries(data.ordersByStatus).map(([status, count]) => `${status}: ${count}`).join(', ') || 'No orders.'} /></div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2"><InventoryTable data={data.inventory} /><section className="grid min-w-0 content-start gap-4 border border-border bg-background-elevated p-5 shadow-lg"><h2 className="font-display text-xl">Inventory value</h2><p className="font-mono text-3xl text-accent-gold">{formatPrice(data.inventory.estimatedValue)}</p><p className="text-sm leading-6 text-text-secondary">Estimated from active variant stock where reliable cost price exists. Missing cost values contribute zero.</p></section></div>
      <RecentOrders orders={data.recentOrders} />
      <p className="text-xs text-text-secondary">Range {data.range.startDate} to {data.range.endDate}; comparison {data.comparison.range.startDate} to {data.comparison.range.endDate}; timezone {data.range.timezone}.</p>
    </> : null}
  </section>;
}
