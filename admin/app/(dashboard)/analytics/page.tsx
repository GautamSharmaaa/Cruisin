// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useAdminAnalytics } from '@/hooks/useAdminResources';

export default function AnalyticsPage(): ReactNode {
  const [days, setDays] = useState(14);
  const analytics = useAdminAnalytics(days);
  return <section className="grid gap-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><h1 className="font-display text-3xl">{COPY.analytics.title}</h1><div className="w-full md:w-64"><SelectField label={COPY.analytics.range} value={String(days)} onChange={(event) => setDays(Number(event.target.value))} options={[{ label: COPY.analytics.lastSeven, value: '7' }, { label: COPY.analytics.lastFourteen, value: '14' }, { label: COPY.analytics.lastThirty, value: '30' }]} /></div></div><AnalyticsChart data={analytics.data ?? []} /></section>;
}
