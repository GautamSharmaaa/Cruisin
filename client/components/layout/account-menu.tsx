// Governed by .rules v1.0
'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LoginRequiredModal } from '@/components/auth/login-required-modal';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export interface AccountMenuProps { }

export function AccountMenu(_props: AccountMenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [protectedAction, setProtectedAction] = useState<'wishlist' | 'orders' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const login = ROUTES.login + '?redirect=' + encodeURIComponent(pathname);

  useEffect(() => {
    const closeMenu = (event: MouseEvent): void => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeMenu); document.removeEventListener('keydown', closeOnEscape); };
  }, []);

  const protectedLink = (action: 'wishlist' | 'orders', label: string): ReactNode => <button role="menuitem" type="button" onClick={() => { setOpen(false); setProtectedAction(action); }} className="flex min-h-11 w-full items-center px-4 text-left text-xs uppercase tracking-[0.1em] text-text-primary transition hover:bg-background-overlay">{label}</button>;

  return <>
    <div ref={containerRef} className="relative hidden md:block">
      <button type="button" aria-label={COPY.nav.account} aria-expanded={open} aria-haspopup="menu" className={'flex h-11 items-center justify-center gap-2 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary ' + (user ? 'w-11' : 'px-3')} onClick={() => setOpen((current) => !current)}>
        <User size={18} />{!user ? <span className="text-xs uppercase tracking-[0.1em]">{COPY.auth.signIn}</span> : null}
      </button>
      {open ? <div role="menu" className="absolute right-0 top-14 w-64 border border-border bg-background-elevated p-2 shadow-lg">
        <p className="border-b border-border px-4 py-3 font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{user ? user.name : COPY.auth.privateAccess}</p>
        {user ? <>
          <Link role="menuitem" href={ROUTES.account} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-xs uppercase tracking-[0.1em] text-text-primary transition hover:bg-background-overlay"><User size={16} />{COPY.auth.myAccount}</Link>
          <Link role="menuitem" href={ROUTES.orders} onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-xs uppercase tracking-[0.1em] text-text-primary transition hover:bg-background-overlay">{COPY.account.orders}</Link>
          <Link role="menuitem" href={ROUTES.wishlist} onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-xs uppercase tracking-[0.1em] text-text-primary transition hover:bg-background-overlay">{COPY.nav.wishlist}</Link>
          <Link role="menuitem" href={ROUTES.preferences} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-xs uppercase tracking-[0.1em] text-text-primary transition hover:bg-background-overlay"><Settings size={16} />{COPY.account.preferences}</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); logout.mutate(); }} className="flex min-h-11 w-full items-center gap-3 px-4 text-xs uppercase tracking-[0.1em] text-text-secondary transition hover:bg-background-overlay hover:text-text-primary"><LogOut size={16} />{COPY.auth.logout}</button>
        </> : <div className="grid gap-2 p-2">
          {protectedLink('wishlist', COPY.nav.wishlist)}
          {protectedLink('orders', COPY.account.orders)}
          <Link role="menuitem" href={login} onClick={() => setOpen(false)} className="flex h-11 items-center justify-center bg-accent-gold px-4 text-center text-xs font-medium uppercase tracking-[0.1em] text-text-inverse">{COPY.auth.whatsapp.continue}</Link>
          <Link role="menuitem" href={login + '&method=alternative'} onClick={() => setOpen(false)} className="flex h-11 items-center justify-center border border-border px-4 text-center text-xs font-medium uppercase tracking-[0.1em] text-text-primary transition hover:border-border-strong">{COPY.auth.whatsapp.useAlternatives}</Link>
        </div>}
      </div> : null}
    </div>
    <LoginRequiredModal open={Boolean(protectedAction)} onOpenChange={(visible) => { if (!visible) setProtectedAction(null); }} next={protectedAction === 'orders' ? ROUTES.orders : ROUTES.wishlist} action={protectedAction ?? 'wishlist'} />
  </>;
}
