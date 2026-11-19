// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { RecoveryTabs } from '@/components/logistics/recovery-tabs';
import { PageHeader } from '@/components/dashboard/page-header';
import { NdrManager } from '@/components/logistics/ndr-manager';
export default function NdrPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Delivery recovery" title="NDR & RTO recovery" subtitle="Prioritize failed delivery attempts, contact customers, request reattempts, and reduce return-to-origin risk." /><RecoveryTabs current="ndr" /><NdrManager /></section>; }
