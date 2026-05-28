// Governed by .rules v1.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export default function NotFound(): ReactNode { return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-5xl">{COPY.common.notFound}</h1><Button className="mt-8"><Link href={ROUTES.home}>{COPY.common.backHome}</Link></Button></main>; }
