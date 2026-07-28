// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { LogisticsAnalytics } from '@/components/logistics/logistics-analytics';
export default function LogisticsAnalyticsPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Fulfilment intelligence" title="Logistics analytics" subtitle="Courier performance, delivery outcomes, NDR and cost from persisted shipment data." /><LogisticsAnalytics /></section>; }
