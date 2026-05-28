// Governed by .rules v1.0
import type { InputHTMLAttributes, ReactNode } from 'react';
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; }
export function Input({ label, error, id, ...props }: InputProps): ReactNode { const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-'); return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary" htmlFor={inputId}><span>{label}</span><input id={inputId} className="mt-2 h-12 w-full border border-border-subtle bg-background-input px-4 text-text-primary focus:border-border-strong" aria-invalid={Boolean(error)} {...props} />{error ? <span className="mt-2 block text-xs text-danger">{error}</span> : null}</label>; }
