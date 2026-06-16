// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';

export interface FooterProps { }
export function Footer(_props: FooterProps): ReactNode { const user = useAuthStore((state) => state.user); return <footer className="border-t border-border px-6 py-12 lg:px-20"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 md:flex-row"><div><p className="font-display text-2xl">{COPY.brand.name}</p><p className="mt-2 text-text-secondary">{COPY.brand.tagline}</p></div><nav className="flex gap-6 text-sm text-text-secondary"><Link href={ROUTES.shop}>{COPY.nav.shop}</Link><Link href={user ? ROUTES.account : ROUTES.login}>{user ? COPY.nav.account : COPY.auth.signIn}</Link>{!user ? <Link href={ROUTES.register}>{COPY.auth.createAccount}</Link> : null}<Link href={ROUTES.cart}>{COPY.nav.cart}</Link></nav></div></footer>; }
