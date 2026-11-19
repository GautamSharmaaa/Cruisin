// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { RecoveryTabs } from '@/components/logistics/recovery-tabs';
import { PageHeader } from '@/components/dashboard/page-header';
import { RtoManager } from '@/components/logistics/rto-manager';
export default function RtoPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Inventory recovery" title="NDR & RTO recovery" subtitle="Track parcels returning to the warehouse and close the inspection-to-inventory loop." /><RecoveryTabs current="rto" /><RtoManager /></section>; }
