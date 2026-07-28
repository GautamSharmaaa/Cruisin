// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { RtoManager } from '@/components/logistics/rto-manager';
export default function RtoPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Inventory recovery" title="RTO manager" subtitle="Track parcels returning to the warehouse and close the inspection-to-inventory loop." /><RtoManager /></section>; }
