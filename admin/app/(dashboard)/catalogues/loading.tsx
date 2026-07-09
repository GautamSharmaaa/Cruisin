// Governed by .rules v1.0
import type { ReactNode } from 'react';

export default function CataloguesLoading(): ReactNode {
  return <div className="grid gap-4"><div className="h-40 animate-pulse border border-border bg-background-elevated" /><div className="h-96 animate-pulse border border-border bg-background-elevated" /></div>;
}
