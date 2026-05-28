// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
export interface ErrorProps { error: Error; reset: () => void; }
export default function Error({ reset }: ErrorProps): ReactNode { return <main className="px-6 py-32 text-center"><h1 className="font-display text-4xl">{COPY.common.error}</h1><Button className="mt-8" onClick={reset}>{COPY.common.retry}</Button></main>; }
