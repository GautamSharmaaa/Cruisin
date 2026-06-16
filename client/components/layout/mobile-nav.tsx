// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Drawer } from '@/components/shared/drawer';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface MobileNavProps { open: boolean; onOpenChange: (open: boolean) => void; }
export function MobileNav({ open, onOpenChange }: MobileNavProps): ReactNode { const user = useAuthStore((state) => state.user); const links = user ? [{ label: COPY.nav.shop, href: ROUTES.shop }, { label: COPY.nav.wishlist, href: ROUTES.wishlist }, { label: COPY.auth.myAccount, href: ROUTES.account }, { label: COPY.account.preferences, href: ROUTES.preferences }] : [{ label: COPY.nav.shop, href: ROUTES.shop }, { label: COPY.auth.signIn, href: ROUTES.login }, { label: COPY.auth.createAccount, href: ROUTES.register }]; return <Drawer open={open} onOpenChange={onOpenChange} title={COPY.nav.menu}><nav className="flex flex-col gap-4">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => onOpenChange(false)} className="border-b border-border py-4 font-display text-2xl">{link.label}</Link>)}</nav></Drawer>; }
