// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface SkeletonCardProps { className?: string; }
export function SkeletonCard({ className = '' }: SkeletonCardProps): ReactNode { return <div className={'aspect-[3/4] bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%] animate-shimmer ' + className} aria-hidden="true" />; }
