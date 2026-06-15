// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { PageHeader } from '@/components/dashboard/page-header';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useAdminAnalytics } from '@/hooks/useAdminResources';

export default function AnalyticsPage(): ReactNode {
  const [days, setDays] = useState(14);
  const analytics = useAdminAnalytics(days);
  const action = <div className="w-full md:w-64"><SelectField label={COPY.analytics.range} value={String(days)} onChange={(event) => setDays(Number(event.target.value))} options={[{ label: COPY.analytics.lastSeven, value: '7' }, { label: COPY.analytics.lastFourteen, value: '14' }, { label: COPY.analytics.lastThirty, value: '30' }]} /></div>;
  return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.analytics.title} subtitle={COPY.analytics.subtitle} action={action} />{analytics.isLoading ? <div className="h-80 animate-pulse border border-border bg-background-elevated" /> : <AnalyticsChart data={analytics.data ?? []} />}{analytics.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>;
}
