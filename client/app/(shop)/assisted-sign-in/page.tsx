'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { CUSTOMER_ACCESS as copy } from '@/constants/customer-access';
import { markAssistedWindow, setAccessToken } from '@/lib/access-token';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

const adminOrigin = new URL(process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://127.0.0.1:3193').origin;
const schema = z.object({
  phone: z.string().trim().max(32).refine((phone) => /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ''))),
  code: z.string().trim().regex(/^[a-f0-9]{20}$/i)
});

export default function AssistedSignInPage(): ReactNode {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [hasOpener, setHasOpener] = useState(false);
  const request = useRef<{ id: string; timer: number } | null>(null);

  useEffect(() => {
    markAssistedWindow();
    setHasOpener(Boolean(window.opener));
    const receive = async (event: MessageEvent): Promise<void> => {
      if (event.source !== window.opener || event.origin !== adminOrigin || !request.current ||
          event.data?.type !== 'cruisin.assisted.result' || event.data.id !== request.current.id) return;
      window.clearTimeout(request.current.timer);
      request.current = null;
      const session = event.data.session;
      if (typeof session?.accessToken !== 'string' || typeof session.expiresAt !== 'number') {
        setMessage(typeof event.data.error === 'string' ? event.data.error : copy.timedOut);
        setPending(false);
        return;
      }
      try {
        setAccessToken(session.accessToken);
        const response = await api.get<ApiEnvelope<User>>('/auth/me');
        useAuthStore.getState().setSession(response.data.data, session.accessToken, session.expiresAt);
        window.opener = null;
        router.replace('/');
      } catch (error) {
        setAccessToken(null);
        setMessage(error instanceof Error ? error.message : copy.ended);
        setPending(false);
      }
    };
    window.addEventListener('message', receive);
    return () => {
      if (request.current) window.clearTimeout(request.current.timer);
      window.removeEventListener('message', receive);
    };
  }, [router]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!window.opener || request.current) return;
    const data = new FormData(event.currentTarget);
    const input = schema.safeParse({ phone: data.get('phone'), code: data.get('code') });
    if (!input.success) { setMessage(copy.invalid); return; }
    setMessage('');
    setPending(true);
    const id = crypto.randomUUID();
    request.current = { id, timer: window.setTimeout(() => {
      request.current = null;
      setPending(false);
      setMessage(copy.timedOut);
    }, 20_000) };
    window.opener.postMessage({ type: 'cruisin.assisted.redeem', id, ...input.data }, adminOrigin);
  }

  return <main className="mx-auto grid min-h-[70vh] max-w-md content-center gap-5 px-5 py-12">
    <h1 className="font-display text-3xl text-text-primary">{copy.heading}</h1>
    <p className="text-sm text-text-secondary">{hasOpener ? copy.description : copy.openFromAdmin}</p>
    {hasOpener && <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm">{copy.phone}<input name="phone" type="tel" autoComplete="off" required className="min-h-12 border border-border bg-background-elevated px-3" /></label>
      <label className="grid gap-2 text-sm">{copy.code}<input name="code" type="password" autoComplete="off" required maxLength={20} className="min-h-12 border border-border bg-background-elevated px-3 font-mono" /></label>
      <button className="min-h-12 bg-accent-gold px-4 font-medium text-text-inverse" disabled={pending}>{pending ? copy.pending : copy.submit}</button>
      {message && <p role="alert" className="text-sm">{message}</p>}
    </form>}
  </main>;
}
