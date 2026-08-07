'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
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
  const content = COPY.auth.prompts[action];
  const login = ROUTES.login + '?redirect=' + encodeURIComponent(next);
  const alternative = login + '&method=alternative';
  return <Modal open={open} onOpenChange={onOpenChange} title={content.title}><p className="max-w-md text-sm leading-6 text-text-secondary">{content.body}</p><div className="mt-7 grid gap-3"><Link href={login} className="inline-flex h-12 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse">{COPY.auth.whatsapp.continue}</Link><Link href={alternative} className="inline-flex h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary">{COPY.auth.whatsapp.useAlternatives}</Link></div><Button type="button" variant="ghost" className="mt-4 px-0 text-text-secondary" onClick={() => onOpenChange(false)}>{content.dismiss}</Button></Modal>;
}
