// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
export interface DashboardShellProps { children: ReactNode; }
export function DashboardShell({ children }: DashboardShellProps): ReactNode { return <><Sidebar /><div className="lg:pl-64"><Topbar /><main className="p-6">{children}</main></div></>; }
