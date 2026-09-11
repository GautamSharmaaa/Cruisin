import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROUTES } from '@/constants/routes';

export interface CheckoutFlowHeaderProps {
  backHref: string;
  backLabel: string;
  secureHref?: string;
}

export function CheckoutFlowHeader({ backHref, backLabel, secureHref }: CheckoutFlowHeaderProps): ReactNode {
  const secureContent = <><ShieldCheck size={14} aria-hidden="true" /><span>Secure</span></>;
  return <header className="grid h-20 grid-cols-[1fr_auto_1fr] items-center border-b border-border-subtle px-5 md:hidden">
    <Link href={backHref} className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.18em] text-text-secondary">← {backLabel}</Link>
    <Link href={ROUTES.home} className="brand-wordmark-script text-[28px] leading-none text-text-primary">Cruisin</Link>
    {secureHref ? <Link href={secureHref} className="inline-flex min-h-11 items-center gap-1.5 justify-self-end text-[9px] uppercase tracking-[0.15em] text-accent-gold">{secureContent}</Link> : <span className="inline-flex items-center gap-1.5 justify-self-end text-[9px] uppercase tracking-[0.15em] text-accent-gold">{secureContent}</span>}
  </header>;
}
