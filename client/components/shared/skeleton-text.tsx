// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface SkeletonTextProps { lines?: number; }
export function SkeletonText({ lines = 3 }: SkeletonTextProps): ReactNode { return <div className="space-y-3" aria-hidden="true">{Array.from({ length: lines }).map((_, index) => <div key={index} className="h-3 bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%] animate-shimmer" />)}</div>; }
