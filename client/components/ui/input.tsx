// Governed by .rules v1.0
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; }

export function Input({ label, error, className, id, ...props }: InputProps): ReactNode {
  const inputId = id ?? label.toLowerCase().replace(/s+/g, '-');
  return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary" htmlFor={inputId}><span>{label}</span><input id={inputId} className={cn('mt-2 h-12 w-full border border-border-subtle bg-background-input px-4 font-body text-base text-text-primary transition focus:border-border-strong', error ? 'border-danger' : '', className)} aria-invalid={Boolean(error)} aria-describedby={error ? inputId + '-error' : undefined} {...props} />{error ? <span id={inputId + '-error'} className="mt-2 block text-xs text-danger" aria-live="polite">{error}</span> : null}</label>;
}
