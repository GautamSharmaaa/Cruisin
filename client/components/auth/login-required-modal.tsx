'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/modal';
import { ROUTES } from '@/constants/routes';

export interface LoginRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
  action: 'checkout' | 'wishlist' | 'orders';
}

const copy = {
  checkout: { title: 'Sign in to place your order', body: 'Create an account or sign in to continue checkout. Your cart will be waiting for you.', dismiss: 'Continue shopping' },
  wishlist: { title: 'Sign in to save this piece', body: 'Save your favourite Cruisin pieces and access them across devices.', dismiss: 'Not now' },
  orders: { title: 'Sign in to view your orders', body: 'Create an account or sign in to access your private order history and delivery updates.', dismiss: 'Continue shopping' }
};

export function LoginRequiredModal({ open, onOpenChange, next, action }: LoginRequiredModalProps): ReactNode {
  const content = copy[action];
  const login = ROUTES.login + '?redirect=' + encodeURIComponent(next);
  const signup = ROUTES.register + '?redirect=' + encodeURIComponent(next);
  return <Modal open={open} onOpenChange={onOpenChange} title={content.title}><p className="max-w-md text-sm leading-6 text-text-secondary">{content.body}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><Link href={login} className="inline-flex h-11 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse">Sign in</Link><Link href={signup} className="inline-flex h-11 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary">Create account</Link></div><Button type="button" variant="ghost" className="mt-4 px-0 text-text-secondary" onClick={() => onOpenChange(false)}>{content.dismiss}</Button></Modal>;
}
