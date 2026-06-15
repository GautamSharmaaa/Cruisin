// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { COPY } from '@/constants/copy';
import { useAdminAnalytics, useAdminOverview } from '@/hooks/useAdminResources';
import { formatPrice } from '@/lib/utils';
export default function OverviewPage(): ReactNode {
  const overview = useAdminOverview();
  const analytics = useAdminAnalytics(14);
  const data = overview.data;
  return <div className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.overview.title} subtitle={COPY.overview.subtitle} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><KpiCard label={COPY.overview.revenue} value={formatPrice(data?.revenue ?? 0)} delta={COPY.analytics.lastFourteen} supporting={COPY.overview.trend} /><KpiCard label={COPY.overview.orders} value={String(data?.orders ?? 0)} delta={COPY.analytics.lastFourteen} supporting={COPY.orders.title} /><KpiCard label={COPY.overview.users} value={String(data?.users ?? 0)} delta={COPY.common.signedIn} supporting={COPY.users.title} /><KpiCard label={COPY.overview.products} value={String(data?.products ?? 0)} delta={COPY.overview.catalog} supporting={COPY.products.title} /></div><section className="grid gap-4 lg:grid-cols-[1fr_320px]"><AnalyticsChart data={analytics.data ?? []} /><aside className="border border-border bg-background-elevated p-6 shadow-lg"><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.overview.inventory}</p><div className="mt-6 grid gap-4 text-sm text-text-secondary"><p className="flex justify-between border-b border-border pb-3"><span>{COPY.overview.conversion}</span><span className="font-mono text-text-primary">{String(data?.conversionRate ?? 0)}{COPY.overview.percent}</span></p><p className="flex justify-between border-b border-border pb-3"><span>{COPY.analytics.orders}</span><span className="font-mono text-text-primary">{analytics.data?.reduce((sum, point) => sum + point.orders, 0) ?? 0}</span></p><p className="flex justify-between"><span>{COPY.analytics.revenue}</span><span className="font-mono text-accent-gold">{formatPrice(analytics.data?.reduce((sum, point) => sum + point.revenue, 0) ?? 0)}</span></p></div></aside></section>{overview.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</div>;
}
