// Governed by .rules v1.0
import type { ReactNode } from 'react';

export default function Loading(): ReactNode {
  return <main className="px-6 py-32 text-center lg:px-20" aria-busy="true"><div className="mx-auto h-4 w-32 animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><div className="mx-auto mt-6 h-12 max-w-sm animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /></main>;
}
