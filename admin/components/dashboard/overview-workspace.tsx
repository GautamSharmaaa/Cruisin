// Governed by .rules v1.0
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, CalendarDays, Grid2X2, Plus, ShoppingBag, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AnalyticsChart, formatSalesMetric, salesMetrics } from './analytics-chart';
import { InsightOrb } from './insight-orb';
import { StorefrontActivity } from './analytics/storefront-activity';
import { OVERVIEW_SALES_COPY as S } from '@/constants/overview-copy';
import { WIDGET_COPY as W } from '@/constants/overview-widgets-copy';
import { useAdminAnalyticsSummary, useAdminMe, useAdminStorefrontActivity } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminAnalyticsSummaryDto, AdminStorefrontActivityDto } from '@/types/dto.types';

type Widget = keyof typeof W.catalog;
const defaults: readonly Widget[] = ['metrics', 'insights', 'sales', 'collection', 'trend', 'orders', 'devices', 'traffic'];
const catalog = Object.keys(W.catalog) as Widget[];
const periods = [['today', 'Today'], ['thisWeek', 'This week'], ['thisMonth', 'This month'], ['thisYear', 'This year']] as const;
type Preset = (typeof periods)[number][0];

function storedWidgets(key: string): Widget[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(value)) return [...new Set(value.filter((id): id is Widget => catalog.includes(id)))];
  } catch {
    // Fall back to the default layout if storage is unavailable.
  }
  return [...defaults];
}

export function OverviewWorkspace(): ReactNode {
  const [preset, setPreset] = useState<Preset>('today');
  const sales = useAdminAnalyticsSummary({ preset }, true, 30_000);
  const traffic = useAdminStorefrontActivity({ preset }, true, 30_000);
  const me = useAdminMe();
  const key = 'cruisin.overview.widgets.' + (me.data?.id ?? me.data?._id ?? 'local');
  const [layout, setLayout] = useState<{ key: string; widgets: Widget[] }>();
  const [panel, setPanel] = useState<'add' | 'manage'>();
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setLayout({ key, widgets: storedWidgets(key) });
  }, [key]);

  const widgets = layout?.key === key ? layout.widgets : defaults;
  const save = (next: Widget[]): void => {
    setLayout({ key, widgets: next });
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* The layout remains usable in memory. */ }
  };
  const move = (index: number, delta: number): void => {
    const next = [...widgets];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    save(next);
  };
  const unavailable = sales.isError;
  const data = sales.data;
  const displayedPreset = (data?.range.preset ?? preset) as Preset;
  const rangeLabel = periods.find(([value]) => value === displayedPreset)?.[1] ?? periods[0][1];
  const rangePending = sales.isPlaceholderData || traffic.isPlaceholderData;
  const available = catalog.filter(id => !widgets.includes(id));

  const render = (widget: Widget): ReactNode => {
    if (widget === 'traffic') return <StorefrontActivity query={traffic} />;
    if (widget === 'devices') return <VisitsWidget data={traffic.data} failed={traffic.isError} />;
    if (widget === 'insights') return <InsightsWidget data={data} preset={displayedPreset} canGenerate={['manager', 'admin', 'superadmin'].includes(me.data?.role ?? '')} failed={unavailable} traffic={traffic.data} updatedAt={sales.dataUpdatedAt} refreshing={sales.isFetching || traffic.isFetching} />;
    if (!data) return <WidgetFrame widget={widget}><WidgetStatus failed={unavailable} /></WidgetFrame>;
    if (widget === 'sales') return <SalesWidget data={data} />;
    if (widget === 'collection') return <CollectionWidget data={data} />;
    if (widget === 'orders') return <OrdersWidget data={data} />;
    if (widget === 'trend') return <AnalyticsChart trend={data.salesTrend} rangeLabel={rangeLabel} />;
    if (widget === 'metrics') return <MetricsWidget data={data} />;
    if (widget === 'products') return <WidgetFrame widget="products" href="/products">
      {data.topProducts.length > 0 ? <ul className="mt-4 grid gap-2">
        {data.topProducts.slice(0, 5).map(product => <li className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm" key={product.productId + product.sku}>
          <Link href={'/products/' + product.productId} className="min-w-0 truncate hover:text-accent-gold">{product.title}</Link>
          <span className="shrink-0 tabular-nums">{formatPrice(product.revenue)}</span>
        </li>)}
      </ul> : <p className="mt-5 text-sm text-text-secondary">{W.noOrders}</p>}
    </WidgetFrame>;
    return <WidgetFrame widget="inventory" href="/products">
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="workspace-stat"><dt>{W.stock}</dt><dd>{data.inventory.lowStock}</dd></div>
        <div className="workspace-stat"><dt>{W.outOfStock}</dt><dd>{data.inventory.outOfStock}</dd></div>
      </dl>
    </WidgetFrame>;
  };

  return <section className="overview-workspace" aria-labelledby="workspace-overview-title">
    <header className="overview-heading">
      <h1 id="workspace-overview-title">Overview</h1>
      <span role="status">{rangePending ? S.updating : rangeLabel + " · India Standard Time"}</span>
    </header>
    <div className="overview-widget-toolbar">
      <div className="overview-period-control"><CalendarDays size={16} />
        <select aria-label="Overview date range" value={preset} onChange={event => setPreset(event.target.value as Preset)}>
          {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="workspace-widget-action" onClick={event => { trigger.current = event.currentTarget; setPanel('manage'); }}><Grid2X2 size={15} />{W.manage}</button>
        <button type="button" className="workspace-widget-action workspace-widget-primary" onClick={event => { trigger.current = event.currentTarget; setPanel('add'); }}><Plus size={17} />{W.add}</button>
      </div>
    </div>
    {widgets.length === 0 && <p className="workspace-widget p-6 text-sm text-text-secondary">{W.empty}</p>}
    <div className="overview-widget-grid" aria-busy={rangePending}>
      {widgets.map(widget => <div key={widget} className="overview-widget-cell" data-widget={widget}>
        {render(widget)}
      </div>)}
    </div>
    <Dialog.Root open={Boolean(panel)} onOpenChange={open => { if (!open) setPanel(undefined); }}>
      <Dialog.Portal><Dialog.Overlay className="ui-overlay cruisin-dialog-overlay" />
        <Dialog.Content className="ui-dialog cruisin-toolbar-dialog" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Dialog.Title className="!m-0">{panel === 'add' ? W.available : W.manage}</Dialog.Title>
            <Dialog.Close asChild><button type="button" className="cruisin-toolbar-button" aria-label="Close"><X size={17} /></button></Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-text-secondary">{panel === 'add' ? W.addDescription : W.manageDescription}</Dialog.Description>
          {panel === 'add' ? <ul className="grid gap-2">
            {available.length === 0 && <li className="text-sm text-text-secondary">{W.allAdded}</li>}
            {available.map(widget => <li key={widget} className="widget-option">
              <div><strong>{W.catalog[widget][0]}</strong><p>{W.catalog[widget][1]}</p></div>
              <button type="button" className="cruisin-toolbar-button" aria-label={W.add + ' ' + W.catalog[widget][0]} onClick={() => save([...widgets, widget])}><Plus size={17} /></button>
            </li>)}
          </ul> : <div className="grid gap-3">
            <ol className="grid gap-2">
              {widgets.map((widget, index) => <li key={widget} className="widget-option">
                <strong>{W.catalog[widget][0]}</strong>
                <div className="flex items-center gap-1">
                  <button type="button" className="cruisin-toolbar-button" aria-label={W.moveUp + ' ' + W.catalog[widget][0]} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
                  <button type="button" className="cruisin-toolbar-button" aria-label={W.moveDown + ' ' + W.catalog[widget][0]} disabled={index === widgets.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
                  <button type="button" className="cruisin-toolbar-button" aria-label={W.remove + ' ' + W.catalog[widget][0]} onClick={() => save(widgets.filter(id => id !== widget))}><X size={16} /></button>
                </div>
              </li>)}
            </ol>
            <button type="button" className="workspace-widget-action justify-self-start" onClick={() => save([...defaults])}>{W.reset}</button>
          </div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}

function WidgetFrame({ widget, href, children }: { widget: Widget; href?: string; children: ReactNode }): ReactNode {
  return <section className="workspace-widget">
    <div className="workspace-widget-title">
      <h2>{W.catalog[widget][0]}</h2>
      {href && <Link href={href} className="cruisin-toolbar-button" aria-label={W.catalog[widget][0]}><ArrowUpRight size={16} /></Link>}
    </div>
    {children}
  </section>;
}

function WidgetStatus({ failed }: { failed: boolean }): ReactNode {
  return <p role={failed ? 'alert' : 'status'} className="py-4 text-sm text-text-secondary">{failed ? W.unavailable : W.loading}</p>;
}

function InsightsWidget({ data, preset, canGenerate, failed, traffic, updatedAt, refreshing }: {
  data?: AdminAnalyticsSummaryDto; preset: Preset; canGenerate: boolean; failed: boolean;
  traffic?: AdminStorefrontActivityDto; updatedAt: number; refreshing: boolean;
}): ReactNode {
  const [step, setStep] = useState(0);
  const generation = useMutation({
    mutationFn: async (range: Preset) => (await api.post<{ data: { text: string; source: 'live' | 'ai' } }>('/admin/analytics/insights', { preset: range })).data.data,
  });
  const { reset } = generation;
  useEffect(() => {
    setStep(0);
    reset();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setStep(current => current + 1);
      reset();
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [preset, reset]);
  if (!data) return <WidgetFrame widget="insights"><WidgetStatus failed={failed} /></WidgetFrame>;
  const summary = data.summary;
  const previous = data.comparison.summary.netRevenue;
  const change = previous ? Math.round(100 * (summary.netRevenue - previous) / previous) : null;
  const insights = [
    { id: 'sales', label: 'Sales', href: '/analytics', metric: formatPrice(summary.netRevenue), headline: ' in paid sales.', detail: change === null ? 'Payments collected in the selected period.' : change === 0 ? 'Unchanged from the previous period.' : `${Math.abs(change)}% ${change > 0 ? 'above' : 'below'} the previous period.` },
    { id: 'payments', label: 'COD', href: '/orders', metric: formatPrice(data.outstanding.cod), headline: ' in pending COD.', detail: `${summary.codPendingOrders.toLocaleString('en-IN')} orders awaiting cash-on-delivery collection.` },
    { id: 'stock', label: 'Stock', href: '/products', metric: data.inventory.outOfStock.toLocaleString('en-IN'), headline: ' products are out of stock.', detail: `${data.inventory.lowStock.toLocaleString('en-IN')} products are running low. Review inventory to prioritize restocking.` },
    { id: 'traffic', label: 'Traffic', href: '/analytics', metric: traffic?.visits.toLocaleString('en-IN'), headline: traffic ? (traffic.visits === 1 ? ' storefront visit.' : ' storefront visits.') : 'Storefront activity is unavailable.', detail: traffic ? `${traffic.customersSignedIn.toLocaleString('en-IN')} customer sign-ins and ${traffic.bagVisitors.toLocaleString('en-IN')} bag visitors in this period.` : W.retryAutomatically },
  ];
  const initialIndex = traffic?.visits ? 3 : data.inventory.outOfStock > 0 ? 2 : 0;
  const active = insights[(initialIndex + step) % insights.length];
  const generated = generation.variables === preset ? generation.data : undefined;
  return <section className="workspace-insight" aria-label={W.insights}>
    <div className="workspace-insight-content">
      <h2 className="workspace-insight-title"><Sparkles size={22} aria-hidden="true" />{generated?.source === 'ai' ? W.ai : W.insights}</h2>
      <div className="workspace-insight-slide">
        <div key={generated?.text ?? active.id} className="workspace-insight-copy">
        <p className="workspace-insight-text">{generated ? 'Store performance summary' : <><strong>{active.metric}</strong>{active.headline}</>}</p>
        <p className="workspace-insight-detail">{generated?.text ?? active.detail}</p>
        </div>
      </div>
      <div className="workspace-insight-bottom">
        <p className="workspace-insight-updated">{failed ? 'Refresh failed · showing last available data' : updatedAt ? 'Updated ' + new Date(updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST' : null}</p>
        <div className="workspace-insight-actions">
          <Link href={active.href}>View {active.label.toLowerCase()} <ArrowRight size={13} /></Link>
          {canGenerate && <button type="button" disabled={generation.isPending || refreshing} onClick={() => generation.mutate(preset)}>{generation.isPending ? W.generating : 'Generate summary'}</button>}
        </div>
        {generation.isError && <p role="status" className="workspace-insight-updated">{W.aiError}</p>}
      </div>
    </div>
    <InsightOrb />
  </section>;
}

function SalesWidget({ data }: { data: AdminAnalyticsSummaryDto }): ReactNode {
  const gradient = useId();
  const animate = !useReducedMotion();
  const points = data.salesTrend.points;
  const total = points.reduce((sum, point) => sum + point.totalRevenue, 0);
  const previous = data.comparison.summary.netRevenue;
  const change = previous > 0 ? Math.round(100 * (data.summary.netRevenue - previous) / previous) : null;
  return <WidgetFrame widget="sales" href="/analytics">
    <p className="workspace-widget-number">{formatPrice(total)}</p>
    <p className="text-xs text-text-secondary">{S.metrics.totalRevenue.detail}</p>
    {change !== null && <p className="mt-2 text-xs text-text-secondary" title={W.currentPeriod}><span className={change < 0 ? 'text-danger' : 'text-success'}>{change > 0 ? '+' : ''}{change}%</span> {W.paidChange}</p>}
    <div className="mb-4 mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
      <span className="workspace-widget-chip">{data.summary.totalOrders} {S.orders.toLowerCase()}</span>
      <span className="workspace-widget-chip">{data.summary.unitsSold} {W.units.toLowerCase()}</span>
    </div>
    {points.some(point => point.totalRevenue !== 0) ? <div className="mt-auto h-20 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} accessibilityLayer>
          <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent-gold)" stopOpacity={0.43} /><stop offset="100%" stopColor="var(--accent-gold)" stopOpacity={0.01} /></linearGradient></defs>
          <XAxis dataKey="period" hide />
          <Tooltip formatter={value => formatPrice(Number(value))} labelStyle={{ color: 'var(--text-primary)' }} contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }} />
          <Area dataKey="totalRevenue" name={S.metrics.totalRevenue.label} stroke="var(--accent-gold)" type="monotone" dot={points.length === 1} strokeWidth={2.5} fill={`url(#${gradient})`} isAnimationActive={animate} animationDuration={520} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div> : <p className="workspace-empty-state !mt-auto">{W.noRevenue}</p>}
  </WidgetFrame>;
}

function CollectionWidget({ data }: { data: AdminAnalyticsSummaryDto }): ReactNode {
  const total = data.salesTrend.points.reduce((sum, point) => sum + point.totalRevenue, 0);
  const paid = data.summary.netRevenue;
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round(paid / total * 100))) : 0;
  return <WidgetFrame widget="collection" href="/orders">
    <p className="workspace-widget-number">{formatPrice(paid)}</p>
    <p className="text-xs text-text-secondary">{S.metrics.paidValue.label}</p>
    <div className="workspace-payment-dial" role={total > 0 ? 'meter' : undefined}
      aria-label={total > 0 ? W.paidOfBooked : undefined} aria-valuenow={total > 0 ? percent : undefined} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 144 78" aria-hidden="true">
        <path d="M 12,72 A 60,60 0 0,1 132,72" pathLength="100" fill="none" className="workspace-payment-track" />
        {total > 0 && <path d="M 12,72 A 60,60 0 0,1 132,72" pathLength="100" fill="none"
          className="workspace-payment-fill" style={{ strokeDashoffset: 100 - percent }} />}
      </svg>
      <span className="workspace-payment-value" aria-hidden="true">{total > 0 ? percent + '%' : S.placeholder}</span>
    </div>
    <p className="text-center text-xs text-text-secondary">{total > 0 ? W.paidOfBooked : W.noRevenue}</p>
    <p className="mt-3 text-xs text-text-secondary">{W.awaiting} · {formatPrice(data.outstanding.cod)}</p>
  </WidgetFrame>;
}

function OrdersWidget({ data }: { data: AdminAnalyticsSummaryDto }): ReactNode {
  const rows = data.recentOrders.slice(0, 5);
  return <WidgetFrame widget="orders" href="/orders">
    {rows.length === 0 ? <div className="workspace-empty-state mt-4 flex items-center gap-3"><ShoppingBag size={20} className="text-accent-gold" /><p>{W.noOrders}</p></div> : <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-xs">
        <thead className="text-text-muted"><tr>{[W.order, W.customer, W.status, W.amount].map(label => <th key={label} className="p-2 font-medium" scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.map(order => <tr key={order.orderId} className="border-t border-border hover:bg-background-overlay">
          <th scope="row" className="p-2 font-medium"><Link className="hover:text-accent-gold" href={'/orders/' + order.orderId}>{order.orderNumber}</Link></th>
          <td className="p-2">{order.customer}</td>
          <td className="p-2 text-text-secondary">{order.orderStatus.replaceAll('_', ' ')}</td>
          <td className="p-2 text-text-primary">{formatPrice(order.total)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </WidgetFrame>;
}

function VisitsWidget({ data, failed }: { data?: AdminStorefrontActivityDto; failed: boolean }): ReactNode {
  const devices = data ? [{ label: W.desktop, value: data.desktopVisits }, { label: W.mobile, value: data.mobileVisits }] : [];
  return <WidgetFrame widget="devices" href="/analytics">
    {!data ? <WidgetStatus failed={failed} /> : <>
      <p className="workspace-widget-number">{data.visits.toLocaleString('en-IN')}</p>
      <p className="text-xs text-text-secondary">{data.visits ? W.visitDevices : W.noTraffic}</p>
      <dl className="mt-4 grid gap-2">
        {devices.map(({ label, value }) => <div key={label} className="grid grid-cols-[60px_1fr_auto] items-center gap-2 text-xs">
          <dt>{label}</dt><div className="workspace-progress" aria-hidden="true"><span style={{ width: (data.visits ? value / data.visits * 100 : 0) + '%' }} /></div><dd className="tabular-nums">{value}</dd>
        </div>)}
      </dl>
      <dl className="workspace-visit-breakdown">
        <div className="workspace-stat"><dt>Visitors with bag adds</dt><dd>{data.bagVisitors}</dd></div>
        <div className="workspace-stat"><dt>Customers signed in</dt><dd>{data.customersSignedIn}</dd></div>
      </dl>
    </>}
  </WidgetFrame>;
}

function MetricsWidget({ data }: { data: AdminAnalyticsSummaryDto }): ReactNode {
  const values = {
    totalRevenue: data.salesTrend.points.reduce((sum, point) => sum + point.totalRevenue, 0),
    pendingCod: data.outstanding.cod,
    paidValue: data.summary.netRevenue,
    unitsSold: data.summary.unitsSold,
  };
  return <dl className="overview-metric-grid">
    {salesMetrics.map(key => <div key={key} className="overview-metric-card" data-metric={key}>
      <span className="overview-metric-art" aria-hidden="true"><i /><i /><i /></span>
      <dt className="overview-metric-label">{S.metrics[key].label}</dt><dd className="overview-metric-value">{formatSalesMetric(key, values[key])}</dd>
    </div>)}
  </dl>;
}
