// Governed by .rules v1.0
'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export default function CataloguesError({ reset }: { reset: () => void }): ReactNode {
  return <div className="border border-danger/60 bg-background-elevated p-6"><h2 className="text-xl text-text-primary">Catalogues could not load</h2><p className="mt-2 text-sm text-text-secondary">Refresh the section and try again.</p><Button className="mt-5" onClick={reset}>Retry</Button></div>;
}
