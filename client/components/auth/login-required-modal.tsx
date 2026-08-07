'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/modal';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';

export interface LoginRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
  action: 'checkout' | 'wishlist' | 'orders';
}

export function LoginRequiredModal({ open, onOpenChange, next, action }: LoginRequiredModalProps): ReactNode {
  const { openMobileAuth } = useMobileAuthSheet();
  const content = COPY.auth.prompts[action];
  const login = ROUTES.login + '?redirect=' + encodeURIComponent(next);
  const alternative = login + '&method=alternative';
  const openSheet = (method: 'whatsapp' | 'alternative'): void => {
    onOpenChange(false);
    openMobileAuth({ next, method });
  };
  return <Modal open={open} onOpenChange={onOpenChange} title={content.title}><p className="max-w-md text-sm leading-6 text-text-secondary">{content.body}</p><div className="mt-7 grid gap-3"><button type="button" onClick={() => openSheet('whatsapp')} className="inline-flex h-12 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse md:hidden">{COPY.auth.whatsapp.continue}</button><Link href={login} className="hidden h-12 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse md:inline-flex">{COPY.auth.whatsapp.continue}</Link><button type="button" onClick={() => openSheet('alternative')} className="inline-flex h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary md:hidden">{COPY.auth.whatsapp.useAlternatives}</button><Link href={alternative} className="hidden h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary md:inline-flex">{COPY.auth.whatsapp.useAlternatives}</Link></div><Button type="button" variant="ghost" className="mt-4 px-0 text-text-secondary" onClick={() => onOpenChange(false)}>{content.dismiss}</Button></Modal>;
}
