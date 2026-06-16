// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
export interface ErrorProps { reset: () => void; }
export default function Error({ reset }: ErrorProps): ReactNode { return <main className="px-6 py-32 text-center"><p className="text-text-secondary">{COPY.common.error}</p><Button className="mt-6" onClick={reset}>{COPY.common.retry}</Button></main>; }
