// Governed by .rules v1.0
'use client';

import { ArrowDown, CalendarDays, ChevronLeft, ChevronRight, Download, Info, Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { getOrderAnalytics, getProductAnalytics, getWebsiteAnalytics, orderAnalytics, productAnalytics, websiteAnalytics, type AnalyticsFilters, type AnalyticsTabKey, type DistributionPoint, type MetricPoint, type ProductInsightCard, type ProductTableRow, type TableData, type TrendPoint } from '@/lib/admin/analytics/mockData';
import { exportToCsv, type CsvRow } from '@/lib/export-csv';
import { cn, formatPrice } from '@/lib/utils';

const palette = {
  gold: '#c8a97e',
  goldDim: '#8a7355',
  blue: '#5b7cfa',
  blueSoft: '#8ea4ff',
  cyan: '#22d3ee',
  teal: '#14b8a6',
  green: '#34d399',
  red: '#ef4444',
  amber: '#f59e0b',
  grid: '#262626',
  muted: '#9a9a9a'
};

const tabs: Array<{ key: AnalyticsTabKey; label: string }> = [
  { key: 'order', label: 'Order' },
  { key: 'website', label: 'Website' },
  { key: 'products', label: 'Product Insight' }
];

const filterOptions = {
  period: ['Day', 'Week', 'Month'],
  order: ['Payment Mode', 'All Payments', 'COD', 'Online', 'Partial-COD'],
  website: ['Traffic Source', 'All Sources', 'Facebook', 'Google', 'Others'],
  products: ['Category / Product', 'All Categories', 'Track Pants Joggers', 'Shorts', 'Pants']
} as const;

interface ChartLine {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

interface ChartBar {
  key: string;
  name: string;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
  formatter?: (value: number | string) => string;
}

function AnalyticsTooltip({ active, label, payload, formatter }: ChartTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  return <div className="min-w-36 border border-border bg-background-overlay p-3 text-xs shadow-lg"><p className="font-mono uppercase tracking-[0.12em] text-accent-gold">{label}</p>{payload.map((item) => <p key={item.name ?? String(item.value)} className="mt-2 flex items-center justify-between gap-4 text-text-secondary"><span className="inline-flex items-center gap-2"><span className="h-2 w-2" style={{ backgroundColor: item.color ?? palette.gold }} />{item.name}</span><span className="font-mono text-text-primary">{formatter ? formatter(item.value ?? 0) : item.value}</span></p>)}</div>;
}

function InfoTooltip({ label }: { label: string }): ReactNode {
  return <button type="button" title={label} aria-label={label} className="inline-flex h-6 w-6 items-center justify-center text-text-muted transition hover:text-accent-gold"><Info size={15} /></button>;
}

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }): ReactNode {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center border border-transparent text-text-secondary transition hover:border-border hover:text-accent-gold">{children}</button>;
}

function ExportButton({ filename, rows, label = COPY.common.export }: { filename: string; rows: CsvRow[]; label?: string }): ReactNode {
  return <Button variant="secondary" onClick={() => exportToCsv(filename, rows)} className="gap-2"><Download size={16} />{label}</Button>;
}

function EmptyState({ title = COPY.common.empty }: { title?: string }): ReactNode {
  return <div className="flex min-h-48 items-center justify-center border border-dashed border-border bg-background-primary/40 p-6 text-center text-sm text-text-secondary">{title}</div>;
}

function LoadingSkeleton(): ReactNode {
  return <div className="grid gap-6"><div className="h-36 animate-pulse border border-border bg-background-elevated" /><div className="grid gap-4 md:grid-cols-3"><div className="h-64 animate-pulse border border-border bg-background-elevated" /><div className="h-64 animate-pulse border border-border bg-background-elevated" /><div className="h-64 animate-pulse border border-border bg-background-elevated" /></div></div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }): ReactNode {
  return <div className="border border-danger/60 bg-background-elevated p-6"><p className="font-display text-xl text-text-primary">{COPY.common.error}</p><p className="mt-2 text-sm text-text-secondary">Analytics could not be prepared. Retry the local data load.</p><Button className="mt-5" onClick={onRetry}>{COPY.common.retry}</Button></div>;
}

function ChartCard({ title, children, className, actions, detailButton = false, info = true }: { title: string; children: ReactNode; className?: string; actions?: ReactNode; detailButton?: boolean; info?: boolean }): ReactNode {
  return <section className={cn('group min-w-0 overflow-hidden border border-border bg-background-elevated shadow-lg transition duration-300 hover:border-accent-gold/60 hover:shadow-gold', className)}><div className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex min-w-0 items-center gap-2"><h2 className="break-words font-display text-xl text-text-primary">{title}</h2>{info ? <InfoTooltip label={title + ' info'} /> : null}</div><div className="flex flex-wrap items-center gap-2">{actions}{detailButton ? <Button variant="secondary" className="h-9 px-4">Detailed View</Button> : null}</div></div><div className="min-w-0 p-4">{children}</div></section>;
}

function MetricCard({ metric }: { metric: MetricPoint }): ReactNode {
  const toneClass = {
    neutral: 'text-text-primary',
    success: 'text-[#34d399]',
    danger: 'text-[#ef4444]',
    info: 'text-[#5b7cfa]',
    gold: 'text-accent-gold'
  }[metric.tone ?? 'neutral'];
  return <article className="group min-h-32 border border-border bg-background-elevated p-5 transition duration-300 hover:border-accent-gold/60 hover:shadow-gold"><p className="text-xs uppercase tracking-[0.14em] text-text-secondary">{metric.label}</p><div className="mt-5 flex flex-wrap items-end gap-3"><p className={cn('font-mono text-3xl', toneClass)}>{metric.value}</p>{metric.detail ? <p className={cn('pb-1 font-mono text-lg', toneClass)}>{metric.detail}</p> : null}</div></article>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }): ReactNode {
  return <label className="relative min-w-0 flex-1 basis-full sm:basis-36 md:flex-none"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none border border-border bg-background-elevated px-4 pr-9 text-sm text-text-primary transition hover:border-border-strong focus:border-accent-gold focus:outline-none"><option value="" disabled>{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronRightIcon /></label>;
}

function ChevronRightIcon(): ReactNode {
  return <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"><ChevronRight size={15} /></span>;
}

function DateRangeFilter({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactNode {
  return <label className="relative min-w-0 flex-[2] basis-full md:flex-none"><span className="sr-only">Date range</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full border border-border bg-background-elevated px-4 pr-10 text-sm text-text-primary transition placeholder:text-text-muted hover:border-border-strong focus:border-accent-gold focus:outline-none" placeholder="Date range" /><CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" /></label>;
}

function AnalyticsTabs({ activeTab, onTabChange }: { activeTab: AnalyticsTabKey; onTabChange: (tab: AnalyticsTabKey) => void }): ReactNode {
  return <div className="flex min-w-0 max-w-full flex-wrap overflow-x-auto border border-border bg-background-elevated p-1">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => onTabChange(tab.key)} className={cn('min-h-11 flex-1 px-4 text-xs font-medium uppercase tracking-[0.12em] transition sm:flex-none sm:px-5', activeTab === tab.key ? 'bg-accent-gold text-text-inverse shadow-gold' : 'text-text-secondary hover:bg-background-overlay hover:text-text-primary')}>{tab.label}</button>)}</div>;
}

function AnalyticsFilterBar({ tab, filters, refreshedAt, onFiltersChange, onExport }: { tab: AnalyticsTabKey; filters: AnalyticsFilters; refreshedAt: string; onFiltersChange: (filters: AnalyticsFilters) => void; onExport: () => void }): ReactNode {
  const extraOptions = filterOptions[tab];
  return <section className="grid min-w-0 gap-4 border border-border bg-background-elevated p-4 shadow-lg lg:grid-cols-[1fr_auto] lg:items-center"><p className="min-w-0 text-sm text-text-secondary"><span className="text-text-primary">{refreshedAt}</span></p><div className="flex min-w-0 flex-wrap gap-3"><FilterSelect label="Period" value={filters.period} options={filterOptions.period} onChange={(period) => onFiltersChange({ ...filters, period: period as AnalyticsFilters['period'] })} /><DateRangeFilter value={filters.dateRange} onChange={(dateRange) => onFiltersChange({ ...filters, dateRange })} /><FilterSelect label="Filter" value={filters.extra} options={extraOptions} onChange={(extra) => onFiltersChange({ ...filters, extra })} /><Button variant="secondary" onClick={onExport} className="w-full gap-2 sm:w-auto"><Download size={16} />Export CSV</Button></div></section>;
}

function LineChartCard({ title, data, lines, className, formatter, yFormatter, height = 300 }: { title: string; data: TrendPoint[]; lines: ChartLine[]; className?: string; formatter?: (value: number | string) => string; yFormatter?: (value: number) => string; height?: number }): ReactNode {
  const rows = [Object.keys(data[0] ?? {}), ...data.map((point) => Object.values(point))];
  return <ChartCard title={title} className={className} actions={<><IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton><IconButton label={title + ' table'}><Table2 size={16} /></IconButton></>}>{data.length === 0 ? <EmptyState /> : <div style={{ height }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}><CartesianGrid stroke={palette.grid} vertical={false} /><XAxis dataKey="label" stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} /><YAxis stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={yFormatter} /><Tooltip content={<AnalyticsTooltip formatter={formatter} />} />{lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} strokeDasharray={line.dashed ? '5 5' : undefined} />)}</LineChart></ResponsiveContainer></div>}</ChartCard>;
}

function BarChartCard({ title, data, bars, layout = 'vertical', className, height = 300, detailButton = false, xFormatter }: { title: string; data: TrendPoint[]; bars: ChartBar[]; layout?: 'horizontal' | 'vertical'; className?: string; height?: number; detailButton?: boolean; xFormatter?: (value: number) => string }): ReactNode {
  const rows = [Object.keys(data[0] ?? {}), ...data.map((point) => Object.values(point))];
  const vertical = layout === 'vertical';
  return <ChartCard title={title} className={className} detailButton={detailButton} actions={<><IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton><IconButton label={title + ' table'}><Table2 size={16} /></IconButton></>}>{data.length === 0 ? <EmptyState /> : <div style={{ height }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 16, right: 18, bottom: 8, left: vertical ? 44 : 0 }}><CartesianGrid stroke={palette.grid} horizontal={!vertical} vertical={vertical} /><XAxis type={vertical ? 'number' : 'category'} dataKey={vertical ? undefined : 'label'} stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} tickFormatter={vertical ? xFormatter : undefined} /><YAxis type={vertical ? 'category' : 'number'} dataKey={vertical ? 'label' : undefined} stroke={palette.muted} tickLine={false} axisLine={{ stroke: palette.grid }} width={vertical ? 118 : 48} /><Tooltip content={<AnalyticsTooltip />} />{bars.map((bar) => <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={vertical ? [0, 2, 2, 0] : [2, 2, 0, 0]} />)}</BarChart></ResponsiveContainer></div>}</ChartCard>;
}

function DonutChartCard({ title, data, className, colors = [palette.blue, palette.blueSoft, palette.cyan, palette.amber], detailButton = false, note }: { title: string; data: DistributionPoint[]; className?: string; colors?: string[]; detailButton?: boolean; note?: string }): ReactNode {
  const rows = [['Label', 'Value'], ...data.map((point) => [point.label, point.value])];
  return <ChartCard title={title} className={className} detailButton={detailButton} actions={<><IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton><IconButton label={title + ' table'}><Table2 size={16} /></IconButton></>}>{data.length === 0 ? <EmptyState /> : <div className="grid min-h-72 gap-4 md:grid-cols-[1fr_180px] md:items-center"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="86%" paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.label} fill={colors[index % colors.length]} />)}</Pie><Tooltip content={<AnalyticsTooltip formatter={(value) => String(value) + '%'} />} /></PieChart></ResponsiveContainer></div><div className="grid content-center gap-3">{data.map((entry, index) => <div key={entry.label} className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-2 text-text-secondary"><span className="h-2.5 w-2.5" style={{ backgroundColor: colors[index % colors.length] }} />{entry.label}</span><span className="font-mono text-text-primary">{entry.value}%</span></div>)}{note ? <p className="mt-2 border border-border bg-background-primary p-3 text-xs text-text-secondary">{note}</p> : null}</div></div>}</ChartCard>;
}

function FunnelChart({ data }: { data: DistributionPoint[] }): ReactNode {
  const max = Math.max(...data.map((step) => step.percent ?? 0), 1);
  return <div className="grid gap-3">{data.map((step, index) => <div key={step.label} className="grid gap-2"><div className="flex items-center justify-between text-sm"><span className="text-text-secondary">{step.label}</span><span className="font-mono text-text-primary">{step.value.toLocaleString('en-IN')} / {step.percent}%</span></div><div className="h-10 bg-background-primary"><div className="flex h-full items-center justify-center text-xs font-semibold text-text-inverse" style={{ width: String(((step.percent ?? 0) / max) * 100) + '%', minWidth: '72px', marginInline: 'auto', backgroundColor: [palette.cyan, palette.teal, '#0e9cb0', '#087987'][index % 4] }}>{step.percent}%</div></div></div>)}</div>;
}

function FunnelChartCard({ title, data, className, detailButton = false }: { title: string; data: DistributionPoint[]; className?: string; detailButton?: boolean }): ReactNode {
  const rows = data.map((item) => ({ Label: item.label, Value: item.value, Percent: item.percent ?? '' }));
  return <ChartCard title={title} className={className} detailButton={detailButton} actions={<><IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton><IconButton label={title + ' table'}><Table2 size={16} /></IconButton></>}><FunnelChart data={data} /></ChartCard>;
}

function RankedListCard({ title, data, className }: { title: string; data: DistributionPoint[]; className?: string }): ReactNode {
  const max = Math.max(...data.map((item) => item.value), 1);
  const rows = data.map((item) => ({ Label: item.label, Value: item.value, Percent: item.percent ?? '' }));
  return <ChartCard title={title} className={className} actions={<><IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton><IconButton label={title + ' table'}><Table2 size={16} /></IconButton></>}><div className="grid gap-4">{data.map((item) => <div key={item.label} className="grid gap-2"><div className="flex items-center justify-between text-sm"><span className="text-text-secondary">{item.label}</span><span className="font-mono text-accent-gold">{item.value}%</span></div><div className="h-2 bg-background-primary"><div className="h-full bg-gradient-to-r from-accent-gold to-[#5b7cfa]" style={{ width: String((item.value / max) * 100) + '%' }} /></div></div>)}</div></ChartCard>;
}

function DataTableCard({ title, table, className, currencyColumns = [] }: { title: string; table: TableData; className?: string; currencyColumns?: string[] }): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortAsc, setSortAsc] = useState(false);
  const sortedRows = useMemo(() => [...table.rows].sort((left, right) => String(left[0]).localeCompare(String(right[0])) * (sortAsc ? 1 : -1)), [sortAsc, table.rows]);
  const pages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const rows = [table.columns, ...table.rows];
  const formatCell = (column: string, cell: string | number): string | number => currencyColumns.includes(column) && typeof cell === 'number' ? formatPrice(cell) : cell;
  return <ChartCard title={title} className={className} info={false} actions={<IconButton label={'Download ' + title} onClick={() => exportToCsv(title.toLowerCase().replaceAll(' ', '-') + '.csv', rows)}><Download size={16} /></IconButton>}><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="sticky top-0 bg-background-overlay text-xs uppercase tracking-[0.12em] text-text-secondary"><tr>{table.columns.map((column, index) => <th key={column} className="border-b border-border p-4"><button type="button" onClick={() => index === 0 ? setSortAsc((current) => !current) : undefined} className="inline-flex items-center gap-2 text-left">{column}{index === 0 ? <ArrowDown size={14} className={cn('transition', sortAsc && 'rotate-180')} /> : null}</button></th>)}</tr></thead><tbody>{visibleRows.map((row, rowIndex) => <tr key={String(row[0]) + rowIndex} className="border-b border-border-subtle transition hover:bg-background-primary/70">{row.map((cell, index) => <td key={table.columns[index]} className="p-4 text-text-secondary">{formatCell(table.columns[index], cell)}</td>)}</tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-text-secondary"><span>Page {page} of {pages}</span><div className="flex items-center gap-2"><IconButton label="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></IconButton><span className="border border-accent-gold px-3 py-1 font-mono text-accent-gold">{page}</span><IconButton label="Next page" onClick={() => setPage((current) => Math.min(pages, current + 1))}><ChevronRight size={16} /></IconButton><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 border border-border bg-background-primary px-3 text-text-primary"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select><span>Items per page</span></div></div></ChartCard>;
}

function ProductCard({ product }: { product: ProductInsightCard }): ReactNode {
  return <article className="grid min-w-0 gap-4 border border-border bg-background-elevated p-4 transition hover:border-accent-gold/60 hover:shadow-gold"><div className="relative h-32 overflow-hidden bg-background-primary" style={{ background: 'linear-gradient(145deg, ' + product.tone + ', #050505)' }}><div className="absolute left-1/2 top-5 h-24 w-12 -translate-x-1/2 rounded-t-full border border-white/10 bg-black/30 shadow-2xl" /><div className="absolute left-1/2 bottom-0 h-20 w-16 -translate-x-1/2 rounded-t-3xl bg-white/10" /></div><div className="min-w-0"><p className="text-xs uppercase tracking-[0.14em] text-text-secondary">Volume Contr.</p><p className="mt-2 font-mono text-2xl text-accent-gold">{product.contribution}%</p><p className="mt-4 text-xs uppercase tracking-[0.14em] text-text-secondary">Order Count</p><p className="mt-1 font-mono text-xl text-text-primary">{product.orders}</p><p className="mt-4 line-clamp-2 min-h-12 text-sm font-medium text-[#8ea4ff]">{product.name}</p><div className="mt-4 flex flex-wrap gap-2"><span className="max-w-full truncate border border-border bg-background-primary px-3 py-2 text-xs text-text-secondary">{product.sku}</span><span className="max-w-full truncate border border-border bg-background-primary px-3 py-2 text-xs text-text-secondary">{product.category}</span></div></div></article>;
}

function ProductInsightTable({ rows }: { rows: ProductTableRow[] }): ReactNode {
  const table: TableData = {
    columns: ['Product Name', 'SKU', 'Category', 'Orders', 'Revenue', 'RTO %', 'Return %', 'Conversion %', 'Stock Status'],
    rows: rows.map((row) => [row.productName, row.sku, row.category, row.orders, row.revenue, row.rto, row.returns, row.conversion, row.stockStatus])
  };
  return <DataTableCard title="Product Insight Details" table={table} currencyColumns={['Revenue']} />;
}

function OrderAnalyticsView(): ReactNode {
  const data = orderAnalytics;
  return <div className="grid gap-6"><div className="grid gap-6 xl:grid-cols-2"><LineChartCard title="Order Trend" data={data.orderTrend} lines={[{ key: 'confirmed', name: 'Confirmed Orders', color: palette.blue }, { key: 'total', name: 'Total Orders', color: palette.blueSoft, dashed: true }]} /><LineChartCard title="Revenue Trend" data={data.revenueTrend} formatter={(value) => typeof value === 'number' ? formatPrice(value) : String(value)} yFormatter={(value) => value === 0 ? '0' : formatPrice(value / 1000) + 'K'} lines={[{ key: 'confirmedRevenue', name: 'Confirmed Orders Revenue', color: palette.blue }, { key: 'totalRevenue', name: 'Total Orders Revenue', color: palette.blueSoft, dashed: true }]} /></div><section className="border border-border bg-background-elevated p-4"><h2 className="font-display text-xl">Order Details</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{data.details.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div></section><DataTableCard title="Order Details Table" table={data.detailsTable} /><div className="grid gap-6 xl:grid-cols-3"><DonutChartCard title="Payment Mode" data={data.paymentModes} /><RankedListCard title="State-wise Order Distribution" data={data.states} /><BarChartCard title="Tier-wise Order Distribution" data={data.tiers.map((item) => ({ label: item.label, total: item.value }))} bars={[{ key: 'total', name: 'Total Orders', color: palette.blue }]} /></div><div className="grid gap-6 xl:grid-cols-2"><DataTableCard title="Top 10 Cities" table={data.topCities} /><DataTableCard title="Top 10 Products" table={data.topProducts} /></div><LineChartCard title="Average Order Value" data={data.aovTrend} height={360} formatter={(value) => typeof value === 'number' ? formatPrice(value) : String(value)} yFormatter={(value) => value === 0 ? '0' : formatPrice(value)} lines={[{ key: 'placed', name: 'AOV (Order Placed)', color: palette.blueSoft, dashed: true }, { key: 'delivered', name: 'AOV (Order Delivered)', color: palette.blue }]} /><DataTableCard title="Order and Payment Summary" table={data.paymentSummary} currencyColumns={['Cash Amount Received', 'Online Payment Received']} /></div>;
}

function WebsiteAnalyticsView(): ReactNode {
  const [mode, setMode] = useState<'Session' | 'Visitor'>('Session');
  const data = websiteAnalytics;
  return <div className="grid gap-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{data.kpis.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><LineChartCard title="Traffic Trend" data={data.trafficTrend} height={360} lines={[{ key: 'sessions', name: 'Sessions Count', color: palette.blue }, { key: 'visitors', name: 'Visitor Count', color: '#22c55e' }, { key: 'bounce', name: 'Bounce Rate %', color: palette.red }]} /><div className="flex w-fit border border-border bg-background-elevated p-1">{(['Session', 'Visitor'] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={cn('min-h-10 px-5 text-xs font-medium uppercase tracking-[0.12em] transition', mode === item ? 'bg-accent-gold text-text-inverse' : 'text-text-secondary hover:bg-background-overlay hover:text-text-primary')}>{item}</button>)}</div><div className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]"><FunnelChartCard title="Website Conversion Funnel" data={data.funnel} /><LineChartCard title="Website Funnel Trend" data={data.funnelTrend} height={300} lines={[{ key: 'clickBuyNow', name: '% Clicks Buy Now', color: palette.blue }, { key: 'paymentInitiated', name: '% Payment Initiated', color: palette.amber }, { key: 'purchased', name: '% Purchased', color: '#22c55e' }]} /></div><div className="grid gap-6 xl:grid-cols-3"><DonutChartCard title="Device Type" data={data.deviceTypes} /><BarChartCard title="Most Visited Pages" data={data.pages.map((item) => ({ label: item.label, visits: item.value }))} bars={[{ key: 'visits', name: 'Visits', color: palette.blue }]} /><BarChartCard title="Traffic Source" data={data.trafficSources.map((item) => ({ label: item.label, visits: item.value }))} bars={[{ key: 'visits', name: 'Visits', color: palette.blue }]} /></div><div className="grid gap-6 xl:grid-cols-3"><BarChartCard title="Gender Distribution (Based on FB Data)" data={data.gender.map((item) => ({ label: item.label, clicks: item.clicks, orders: item.orders }))} layout="horizontal" bars={[{ key: 'clicks', name: 'Clicks %', color: '#2d9bf0' }, { key: 'orders', name: 'Order Volume %', color: palette.amber }]} /><BarChartCard title="Browser/OS" data={data.browsers.map((item) => ({ label: item.label, visits: item.value }))} bars={[{ key: 'visits', name: 'Visits', color: palette.blue }]} /><BarChartCard title="Age Distribution (Based on FB Data)" data={data.age.map((item) => ({ label: item.label, clicks: item.clicks, orders: item.orders }))} layout="horizontal" bars={[{ key: 'clicks', name: 'Clicks %', color: '#2d9bf0' }, { key: 'orders', name: 'Order Volume %', color: palette.amber }]} /></div><div className="grid gap-6 xl:grid-cols-3"><BarChartCard title="Avg #times page opened per session" data={data.pageOpens.map((item) => ({ label: item.label, average: item.value }))} layout="horizontal" bars={[{ key: 'average', name: 'Average', color: '#2d9bf0' }]} /><BarChartCard title="Bounce Rate vs Traffic Source" data={data.bounceSources.map((item) => ({ label: item.label, rate: item.value }))} bars={[{ key: 'rate', name: 'Bounce Rate', color: palette.blue }]} xFormatter={(value) => String(value) + '%'} /><DonutChartCard title="#Products in Cart vs Order Volume%" data={data.cartProducts} note="Average #product added in Cart 1" /></div><LineChartCard title="Hourly Trend" data={data.hourlyTrend} height={360} lines={[{ key: 'productVisitors', name: 'Product Page Visitor', color: palette.blue }, { key: 'orders', name: 'Order Count', color: '#22c55e' }]} /></div>;
}

function ProductAnalyticsView(): ReactNode {
  const [split, setSplit] = useState<'Product Category Split' | 'Average Order Value Split' | 'Size Split'>('Product Category Split');
  const data = productAnalytics;
  return <div className="grid min-w-0 gap-6"><section className="min-w-0 overflow-hidden border border-border bg-background-elevated p-4 shadow-lg"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">Top 5 Products</h2><Button variant="secondary">Detailed View</Button></div><div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">{data.topProducts.map((product) => <ProductCard key={product.sku} product={product} />)}</div></section><section className="min-w-0 overflow-hidden border border-border bg-background-elevated shadow-lg"><div className="border-b border-border p-4"><h2 className="font-display text-xl">Split</h2></div><div className="flex min-w-0 flex-wrap gap-1 border-b border-border bg-background-primary/50 p-4">{(['Product Category Split', 'Average Order Value Split', 'Size Split'] as const).map((item) => <button key={item} type="button" onClick={() => setSplit(item)} className={cn('min-h-11 px-4 text-xs font-medium uppercase tracking-[0.1em] transition', split === item ? 'border-b border-accent-gold text-accent-gold' : 'text-text-secondary hover:text-text-primary')}>{item}</button>)}</div><div className="grid min-w-0 gap-6 p-4 xl:grid-cols-3"><BarChartCard title="Product Quality" data={data.quality.map((item) => ({ label: item.label, score: item.value }))} layout="horizontal" bars={[{ key: 'score', name: 'Product Quality Score', color: palette.blue }]} detailButton /><DonutChartCard title="Order Placed Count" data={data.orderCount} detailButton /><BarChartCard title="RTO %" data={data.rto.map((item) => ({ label: item.label, rto: item.value }))} bars={[{ key: 'rto', name: 'RTO %', color: palette.blue }]} detailButton xFormatter={(value) => String(value) + '%'} /><FunnelChartCard title="Website Funnel" data={data.websiteFunnel} detailButton /><DonutChartCard title="FB Marketing Spend" data={data.marketingSpend} detailButton colors={[palette.gold, palette.blue, palette.cyan]} /><BarChartCard title="Return/Exchange %" data={data.returns.map((item) => ({ label: item.label, returns: item.value }))} bars={[{ key: 'returns', name: 'Return/Exchange %', color: palette.red }]} detailButton xFormatter={(value) => String(value) + '%'} /></div></section><ProductInsightTable rows={data.productTable} /></div>;
}

const tabDefaults: Record<AnalyticsTabKey, AnalyticsFilters> = {
  order: orderAnalytics.filters,
  website: websiteAnalytics.filters,
  products: productAnalytics.filters
};

function tabRows(tab: AnalyticsTabKey): CsvRow[] {
  if (tab === 'order') return [orderAnalytics.detailsTable.columns, ...orderAnalytics.detailsTable.rows, [], orderAnalytics.paymentSummary.columns, ...orderAnalytics.paymentSummary.rows];
  if (tab === 'website') return [...websiteAnalytics.kpis.map((metric) => ({ Metric: metric.label, Value: metric.value })), ...websiteAnalytics.trafficTrend];
  return productAnalytics.productTable.map((row) => ({ Product: row.productName, SKU: row.sku, Category: row.category, Orders: row.orders, Revenue: row.revenue, RTO: row.rto, Returns: row.returns, Conversion: row.conversion, Stock: row.stockStatus }));
}

export function AnalyticsDashboard(): ReactNode {
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>('order');
  const [filters, setFilters] = useState<Record<AnalyticsTabKey, AnalyticsFilters>>(tabDefaults);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'website' || tab === 'products' || tab === 'order') setActiveTab(tab);
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setHasError(false);
    const load = async (): Promise<void> => {
      try {
        if (activeTab === 'order') await getOrderAnalytics(filters.order);
        if (activeTab === 'website') await getWebsiteAnalytics(filters.website);
        if (activeTab === 'products') await getProductAnalytics(filters.products);
        window.history.replaceState(null, '', '/analytics?tab=' + activeTab);
      } catch {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab, filters]);

  const refreshedAt = activeTab === 'order' ? orderAnalytics.refreshedAt : activeTab === 'website' ? websiteAnalytics.refreshedAt : productAnalytics.refreshedAt;
  const title = activeTab === 'order' ? 'Order Analytics' : activeTab === 'website' ? 'Website Analytics' : 'Product Insight Analytics';
  const subtitle = activeTab === 'order' ? 'Order, revenue, payment, location, and fulfilment health in one dark command view.' : activeTab === 'website' ? 'Traffic quality, conversion motion, and visitor composition across the storefront.' : 'Product-level contribution, category split, returns, and stock pressure signals.';

  return <section className="grid min-w-0 gap-6"><header className="grid min-w-0 gap-4 overflow-hidden border border-border bg-background-elevated p-5 shadow-lg lg:grid-cols-[1fr_auto] lg:items-end"><div className="min-w-0"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-gold">{COPY.brand.eyebrow}</p><h1 className="mt-3 break-words font-display text-3xl text-text-primary lg:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{subtitle}</p></div><AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} /></header><AnalyticsFilterBar tab={activeTab} filters={filters[activeTab]} refreshedAt={refreshedAt} onFiltersChange={(nextFilters) => setFilters((current) => ({ ...current, [activeTab]: nextFilters }))} onExport={() => exportToCsv(activeTab + '-analytics.csv', tabRows(activeTab))} />{hasError ? <ErrorState onRetry={() => setHasError(false)} /> : isLoading ? <LoadingSkeleton /> : activeTab === 'order' ? <OrderAnalyticsView /> : activeTab === 'website' ? <WebsiteAnalyticsView /> : <ProductAnalyticsView />}</section>;
}
