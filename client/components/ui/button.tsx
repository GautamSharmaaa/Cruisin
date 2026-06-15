// Governed by .rules v1.0
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { COPY } from '@/constants/copy';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; isLoading?: boolean; children: ReactNode; }

export function Button({ variant = 'primary', isLoading = false, className, children, disabled, ...props }: ButtonProps): ReactNode {
  const variants = { primary: 'bg-accent-gold text-text-inverse shadow-gold hover:brightness-110', secondary: 'border border-border text-text-primary hover:border-border-strong hover:bg-background-elevated', ghost: 'text-text-secondary hover:text-text-primary hover:bg-background-elevated', danger: 'bg-danger text-text-primary' };
  return <button className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-2 px-6 font-body text-xs font-medium uppercase tracking-[0.1em] transition duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} disabled={disabled || isLoading} {...props}>{isLoading ? COPY.common.processing : children}</button>;
}
