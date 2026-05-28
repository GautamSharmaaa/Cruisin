// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { COPY } from '@/constants/copy';
export default function OverviewPage(): ReactNode { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><KpiCard label={COPY.overview.revenue} value="₹8.4L" delta="+18%" /><KpiCard label={COPY.overview.orders} value="142" delta="+7%" /><KpiCard label={COPY.overview.users} value="9,841" delta="+11%" /><KpiCard label={COPY.overview.conversion} value="4.8%" delta="+0.6%" /></div><AnalyticsChart /></div>; }
