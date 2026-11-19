// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { isEmployeePath, Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
export interface DashboardShellProps { children: ReactNode; }
export function DashboardShell({ children }: DashboardShellProps): ReactNode {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const employee = isEmployeePath(usePathname());
  return <div className="cruisin-workspace-shell">
    <Topbar employee={employee} onMenu={() => setIsNavigationOpen(true)} />
    <div className="cruisin-workspace-grid">
      <Sidebar employee={employee} isOpen={isNavigationOpen} onClose={() => setIsNavigationOpen(false)} />
      <main className="cruisin-workspace-main" key={employee ? 'employee' : 'admin'}>{children}</main>
    </div>
  </div>;
}
