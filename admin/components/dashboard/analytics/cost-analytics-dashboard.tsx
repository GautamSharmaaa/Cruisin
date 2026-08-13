// Governed by .rules v1.0
'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminMe, useProfitabilityAnalytics } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { exportToCsv } from '@/lib/export-csv';
import { formatPrice } from '@/lib/utils';
import type { ProfitabilityRowDto } from '@/types/dto.types';

const presets = [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year'], ['all', 'All time']] as const;
const today = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const selectClass = 'h-11 w-full border border-border bg-background-primary px-3 text-sm text-text-primary outline-none focus:border-accent-gold';
const labelClass = 'grid gap-2 text-[11px] uppercase tracking-[0.1em] text-text-muted';
const options = (values: Array<[string, string]>): ReactNode => values.map(([value, label]) => <option key={value} value={value}>{label}</option>);

const csvRows = (rows: ProfitabilityRowDto[]) => rows.map((row) => ({
  'Order': row.orderNumber, 'Date': row.date, 'Product ID': row.productId, 'SKU': row.sku, 'Product': row.product, 'Size': row.size, 'Colour': row.color, 'Qty': row.quantity,
  'Selling value': row.sellingValue, 'Payment': row.paymentMode, 'COD state': row.codState, 'Collected revenue (GST excluded)': row.collectedRevenue,
  'COD fee': row.codFee, 'Return fee': row.returnFee, 'Exchange fee': row.exchangeFee, 'Refund': row.refund,
  'Manufacturing': row.manufacturingCost, 'Packaging': row.packagingCost, 'Marketing': row.marketingCost, 'Handling': row.handlingCost, 'Other product cost': row.otherCost, 'Product cost': row.productCost,
  'Forward logistics': row.forwardFreight, 'Reverse logistics': row.reverseFreight, 'Freight source': row.freightSource,
  'Total income': row.totalIncome, 'Total cost': row.totalCost, 'Net profit': row.netProfit, 'Margin %': row.margin, 'Missing product costs': row.missingCosts ? 'Yes' : 'No'
}));

export function CostAnalyticsDashboard(): ReactNode {
  const [preset, setPreset] = useState('month');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [payment, setPayment] = useState('all');
  const [cod, setCod] = useState('all');
  const [service, setService] = useState('all');
  const [freight, setFreight] = useState('all');
  const [result, setResult] = useState('all');
  const [search, setSearch] = useState('');
  const [includeTestOrders, setIncludeTestOrders] = useState(false);
  const [costCsvMessage, setCostCsvMessage] = useState('');
  const costCsvInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const me = useAdminMe();
  const params = useMemo(() => ({ preset, startDate: preset === 'custom' ? startDate : undefined, endDate: preset === 'custom' ? endDate : undefined, payment, cod, service, freight, result, search: search || undefined, includeTestOrders }), [cod, endDate, freight, includeTestOrders, payment, preset, result, search, service, startDate]);
  const report = useProfitabilityAnalytics(params);
  const data = report.data;
  const download = (): void => { if (data?.rows.length) exportToCsv(`cruisin-cost-analysis-${data.filenameLabel}.csv`, csvRows(data.rows)); };
  const downloadProductCosts = async (): Promise<void> => {
    setCostCsvMessage('');
    try { const response = await api.get<{ data: Array<Record<string, string | number>> }>('/admin/analytics/product-costs'); exportToCsv('cruisin-product-costs.csv', response.data.data); }
    catch (error) { setCostCsvMessage(error instanceof Error ? error.message : 'Product cost CSV could not be downloaded.'); }
  };
  const importCosts = useMutation({ mutationFn: async (file: File): Promise<{ updated: number }> => { const form = new FormData(); form.append('file', file); return (await api.post<{ data: { updated: number } }>('/admin/analytics/product-costs/import', form)).data.data; }, onSuccess: async (result) => { setCostCsvMessage(`${result.updated} product cost records updated. New costs apply to future orders; historical order snapshots are unchanged.`); await Promise.all([report.refetch(), queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })]); }, onError: (error) => setCostCsvMessage(error.message) });
  return <section className="grid min-w-0 gap-6">
    <header className="border border-border bg-background-elevated p-5 shadow-lg"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">Finance intelligence</p><h1 className="mt-3 font-display text-3xl text-text-primary lg:text-4xl">Cost & COD analytics</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-text-secondary">A simple order-level profit view combining Cruisin sales and product costs, Razorpay return/exchange fees and refunds, and Shiprocket forward/reverse logistics charges. GST is excluded.</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void report.refetch()}><RefreshCw size={15} className="mr-2" />Refresh</Button><Button onClick={download} disabled={!data?.rows.length}><Download size={15} className="mr-2" />Download filtered CSV</Button></div></header>

    <section className="border border-border bg-background-elevated p-4 shadow-lg"><h2 className="font-display text-xl text-text-primary">Edit product costs by CSV</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Download one simple sheet, change Manufacturing, Packaging, Marketing, Handling or Other, then upload the same file. Total Cost is recalculated automatically.</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void downloadProductCosts()} disabled={!['admin', 'superadmin'].includes(String(me.data?.role))}><Download size={15} className="mr-2" />Download product costs</Button><input ref={costCsvInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importCosts.mutate(file); }} /><Button variant="secondary" onClick={() => costCsvInput.current?.click()} disabled={importCosts.isPending || !['admin', 'superadmin'].includes(String(me.data?.role))}>{importCosts.isPending ? 'Validating…' : 'Upload edited costs'}</Button></div>{costCsvMessage ? <p role="status" className="mt-3 text-sm text-text-secondary">{costCsvMessage}</p> : null}<p className="mt-3 text-xs text-text-muted">For safety, the whole file is validated before any product is updated. Cost edits affect future orders only.</p></section>

    <section className="grid gap-4 border border-border bg-background-elevated p-4 shadow-lg"><div className="flex flex-wrap gap-2" role="group" aria-label="Cost analytics date range">{presets.map(([value, label]) => <button key={value} type="button" onClick={() => setPreset(value)} aria-pressed={preset === value} className={(preset === value ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-secondary') + ' min-h-11 border px-3 text-xs uppercase tracking-[0.08em]'}>{label}</button>)}<button type="button" onClick={() => setPreset('custom')} aria-pressed={preset === 'custom'} className={(preset === 'custom' ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-secondary') + ' min-h-11 border px-3 text-xs uppercase tracking-[0.08em]'}>Custom</button></div>
      {preset === 'custom' ? <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={selectClass} /></label><label className={labelClass}>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={selectClass} /></label></div> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className={labelClass}>Payment<select value={payment} onChange={(event) => setPayment(event.target.value)} className={selectClass}>{options([['all', 'All payments'], ['cod', 'COD'], ['prepaid', 'Prepaid']])}</select></label><label className={labelClass}>COD state<select value={cod} onChange={(event) => setCod(event.target.value)} className={selectClass}>{options([['all', 'All COD states'], ['pending', 'Pending collection'], ['collected', 'Collected']])}</select></label><label className={labelClass}>Order type<select value={service} onChange={(event) => setService(event.target.value)} className={selectClass}>{options([['all', 'All orders'], ['order', 'Normal orders'], ['return', 'Returns'], ['exchange', 'Exchanges']])}</select></label><label className={labelClass}>Freight<select value={freight} onChange={(event) => setFreight(event.target.value)} className={selectClass}>{options([['all', 'All freight'], ['billed', 'Shiprocket billed'], ['estimated', 'Estimated'], ['missing', 'Missing']])}</select></label><label className={labelClass}>Result<select value={result} onChange={(event) => setResult(event.target.value)} className={selectClass}>{options([['all', 'All results'], ['profit', 'Profit'], ['loss', 'Loss'], ['missing_cost', 'Missing costs']])}</select></label></div>
      <label className={labelClass}>Find order, product ID or SKU<span className="flex h-11 items-center border border-border bg-background-primary px-3"><Search size={15} className="mr-2" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm normal-case text-text-primary outline-none" /></span></label>
      {me.data?.role === 'superadmin' ? <label className="inline-flex min-h-11 items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={includeTestOrders} onChange={(event) => setIncludeTestOrders(event.target.checked)} />Include test orders</label> : null}
    </section>

    {report.isLoading ? <p className="border border-border bg-background-elevated p-6 text-sm text-text-secondary">Calculating costs…</p> : null}
    {report.error ? <p role="alert" className="border border-danger/50 bg-danger/10 p-5 text-sm text-danger">{report.error.message}</p> : null}
    {data ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[
      ['Matching orders', data.summary.orders, false], ['Collected revenue', data.summary.collectedRevenue, true], ['Pending COD', data.summary.pendingCod, true], ['Product costs', data.summary.productCosts, true], ['Logistics costs', data.summary.logisticsCosts, true], ['Net profit', data.summary.netProfit, true]
    ].map(([label, value, currency]) => <article key={String(label)} className="border border-border bg-background-elevated p-4"><p className="text-xs uppercase tracking-[0.1em] text-text-muted">{label}</p><p className="mt-3 font-mono text-xl text-text-primary">{currency ? formatPrice(Number(value)) : Number(value).toLocaleString('en-IN')}</p></article>)}</div>
      <div className="overflow-x-auto border border-border bg-background-elevated"><table className="min-w-[1700px] w-full text-left text-xs"><thead className="uppercase tracking-[0.08em] text-text-muted"><tr>{['Order / date', 'Product ID / SKU', 'Product', 'Sale', 'Payment / COD', 'Fees', 'Product costs', 'Logistics', 'Refund', 'Total cost', 'Net profit', 'Margin'].map((heading) => <th key={heading} className="border-b border-border p-3">{heading}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={`${row.orderId}-${row.sku}`} className="border-b border-border-subtle align-top"><td className="p-3"><p className="font-mono text-text-primary">{row.orderNumber}</p><p className="mt-1 text-text-muted">{new Date(row.date).toLocaleString('en-IN')}</p></td><td className="p-3 font-mono text-text-secondary"><p>{row.productId}</p><p className="mt-1">{row.sku}</p></td><td className="p-3 text-text-primary">{row.product}<p className="mt-1 text-text-muted">{[row.size, row.color].filter(Boolean).join(' / ')} · Qty {row.quantity}</p></td><td className="p-3 font-mono">{formatPrice(row.sellingValue)}<p className="mt-1 text-text-muted">Collected {formatPrice(row.collectedRevenue)}</p></td><td className="p-3 text-text-secondary">{row.paymentMode}<p className="mt-1 uppercase">{row.codState.replaceAll('_', ' ')}</p></td><td className="p-3 text-text-secondary">COD {formatPrice(row.codFee)}<p>Return {formatPrice(row.returnFee)}</p><p>Exchange {formatPrice(row.exchangeFee)}</p></td><td className="p-3 text-text-secondary">{formatPrice(row.productCost)}<p className="mt-1">Mfg {formatPrice(row.manufacturingCost)} · Marketing {formatPrice(row.marketingCost)}</p>{row.missingCosts ? <p className="mt-1 text-warning">Missing cost setup</p> : null}</td><td className="p-3 text-text-secondary">Forward {formatPrice(row.forwardFreight)}<p>Reverse {formatPrice(row.reverseFreight)}</p><p className="mt-1 uppercase">{row.freightSource}</p></td><td className="p-3 font-mono">{formatPrice(row.refund)}</td><td className="p-3 font-mono">{formatPrice(row.totalCost)}</td><td className={'p-3 font-mono ' + (row.netProfit >= 0 ? 'text-success' : 'text-danger')}>{formatPrice(row.netProfit)}</td><td className="p-3 font-mono">{row.margin.toFixed(2)}%</td></tr>)}{!data.rows.length ? <tr><td colSpan={12} className="p-10 text-center text-text-muted">No records match these filters.</td></tr> : null}</tbody></table></div>
      <p className="text-xs leading-5 text-text-muted">Shiprocket billed freight is used when available; otherwise the row is clearly marked estimated or missing. COD becomes customer-collected when Shiprocket reports the forward shipment delivered, but this does not claim that Shiprocket has remitted the money to Cruisin. ₹100 return/exchange fees are counted only after Razorpay verification.</p></> : null}
  </section>;
}
