// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { SkeletonText } from '@/components/shared/skeleton-text';

export default function Loading(): ReactNode { return <main className="px-6 py-32 lg:px-20"><SkeletonText lines={4} /></main>; }
