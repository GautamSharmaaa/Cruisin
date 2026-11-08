// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
export interface DashboardShellProps { children: ReactNode; }
export function DashboardShell({ children }: DashboardShellProps): ReactNode {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  return <div className="min-h-dvh min-w-0 overflow-x-hidden bg-background-primary"><Sidebar isOpen={isNavigationOpen} onClose={() => setIsNavigationOpen(false)} /><div className="min-w-0 lg:pl-72"><Topbar onMenu={() => setIsNavigationOpen(true)} /><main className="mx-auto grid w-full max-w-[1480px] min-w-0 gap-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main></div></div>;
}
