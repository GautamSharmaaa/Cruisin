// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ExchangesManager } from '@/components/logistics/exchanges-manager';
export default function ExchangesPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Post-purchase care" title="Exchanges" subtitle="Reserve replacement inventory, inspect returned items, and track replacement fulfilment without losing the original order trail." /><ExchangesManager /></section>; }
