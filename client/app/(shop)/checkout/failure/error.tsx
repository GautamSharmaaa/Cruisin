// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';

export default function Error(): ReactNode { return <main className="px-6 py-32 text-center lg:px-20"><h1 className="font-display text-4xl">{COPY.common.error}</h1></main>; }
