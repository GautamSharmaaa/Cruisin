// Governed by .rules v1.0
'use client';

import { Download, LogOut, Menu, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAdminLogout } from '@/hooks/useAdminAuth';

export interface TopbarProps {
  onMenu: () => void;
}

export function Topbar({ onMenu }: TopbarProps): ReactNode {
  const logout = useAdminLogout();
  const refresh = (): void => window.location.reload();
  return <header className="sticky top-0 z-30 border-b border-border bg-background-primary/85 backdrop-blur-2xl"><div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button type="button" aria-label={COPY.nav.menu} onClick={onMenu} className="flex h-11 w-11 items-center justify-center border border-border text-text-primary transition hover:border-border-strong lg:hidden"><Menu size={18} /></button><div className="hidden w-80 md:block"><Input label={COPY.common.search} /></div></div><div className="flex items-center gap-2"><Button variant="ghost" onClick={refresh} aria-label={COPY.common.refresh} className="px-3"><RefreshCw size={16} /></Button><Button variant="secondary" className="hidden gap-2 md:inline-flex"><Download size={16} />{COPY.common.export}</Button><Button variant="secondary" onClick={logout} className="gap-2"><LogOut size={16} />{COPY.nav.logout}</Button></div></div></header>;
}
