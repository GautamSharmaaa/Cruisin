// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { SkeletonCard } from '@/components/shared/skeleton-card';
export default function Loading(): ReactNode { return <main className="grid grid-cols-1 gap-px px-6 py-24 md:grid-cols-2 xl:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></main>; }
