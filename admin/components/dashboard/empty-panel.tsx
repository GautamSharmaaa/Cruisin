// Governed by .rules v1.0
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyPanelProps {
  title: string;
  message: string;
}

export function EmptyPanel({ title, message }: EmptyPanelProps): ReactNode {
  return <div className="flex min-h-56 flex-col items-center justify-center border border-border bg-background-elevated p-8 text-center"><Inbox className="text-accent-gold" size={28} /><h2 className="mt-4 font-display text-2xl text-text-primary">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">{message}</p></div>;
}
