// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
export interface DashboardLayoutProps { children: ReactNode; }
export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode { return <DashboardShell>{children}</DashboardShell>; }
