// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { COPY } from '@/constants/copy';
import { useAdminAnalytics, useAdminOverview } from '@/hooks/useAdminResources';
import { formatPrice } from '@/lib/utils';
export default function OverviewPage(): ReactNode { const overview = useAdminOverview(); const analytics = useAdminAnalytics(14); const data = overview.data; return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><KpiCard label={COPY.overview.revenue} value={formatPrice(data?.revenue ?? 0)} delta={COPY.analytics.lastFourteen} /><KpiCard label={COPY.overview.orders} value={String(data?.orders ?? 0)} delta={COPY.analytics.lastFourteen} /><KpiCard label={COPY.overview.users} value={String(data?.users ?? 0)} delta={COPY.analytics.lastFourteen} /><KpiCard label={COPY.overview.conversion} value={String(data?.conversionRate ?? 0) + COPY.overview.percent} delta={COPY.analytics.lastFourteen} /></div><AnalyticsChart data={analytics.data ?? []} /></div>; }
