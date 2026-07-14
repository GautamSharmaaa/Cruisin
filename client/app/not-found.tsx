// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export default function NotFound(): ReactNode { return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-5xl">{COPY.common.notFound}</h1><Link href={ROUTES.home} className="mt-8 inline-flex h-11 min-w-11 items-center justify-center bg-accent-gold px-6 font-body text-xs font-medium uppercase tracking-[0.1em] text-text-inverse shadow-gold transition duration-300 hover:brightness-110 active:scale-[0.98]">{COPY.common.backHome}</Link></main>; }
