// Governed by .rules v1.0
import type { SelectHTMLAttributes, ReactNode } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
}

export function SelectField({ label, error, id, options, ...props }: SelectFieldProps): ReactNode {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary" htmlFor={inputId}><span>{label}</span><select id={inputId} className="mt-2 h-12 w-full border border-border-subtle bg-background-input px-4 text-text-primary focus:border-border-strong" aria-invalid={Boolean(error)} {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error ? <span className="mt-2 block text-xs text-danger">{error}</span> : null}</label>;
}
