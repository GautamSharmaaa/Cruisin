// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { LogisticsControlCenter } from '@/components/logistics/logistics-control-center';
import { PageHeader } from '@/components/dashboard/page-header';
export default function LogisticsPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Fulfilment operations" title="Logistics control center" subtitle="Create orders, finish shipping in Shiprocket, and mirror courier tracking safely into Cruisin." /><LogisticsControlCenter /></section>; }
