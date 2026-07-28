// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ReturnsManager } from '@/components/logistics/returns-manager';
export default function ReturnsPage(): ReactNode { return <section className="grid gap-6"><PageHeader eyebrow="Post-purchase care" title="Returns" subtitle="Review eligibility, arrange reverse pickup, record warehouse quality checks, and hand eligible refunds to payment operations." /><ReturnsManager /></section>; }
