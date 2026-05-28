// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { COPY } from '@/constants/copy';
export default function AnalyticsPage(): ReactNode { return <section><h1 className="mb-6 font-display text-3xl">{COPY.analytics.title}</h1><AnalyticsChart /></section>; }
