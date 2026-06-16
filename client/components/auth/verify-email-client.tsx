// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { ROUTES } from '@/constants/routes';
import { useVerifyEmail } from '@/hooks/useAuth';

export interface VerifyEmailClientProps {
  token: string;
}

export function VerifyEmailClient({ token }: VerifyEmailClientProps): ReactNode {
  const verifyEmail = useVerifyEmail();
  const requested = useRef(false);

  useEffect(() => {
    if (token && !requested.current) {
      requested.current = true;
      verifyEmail.mutate(token);
    }
  }, [token]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-6 py-32">
      <section className="w-full border border-border bg-background-elevated p-8 text-center">
        <p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">Account verification</p>
        <h1 className="mt-4 font-display text-4xl text-text-primary">
          {verifyEmail.isPending ? 'Verifying email' : verifyEmail.isSuccess ? 'Email verified' : 'Verification failed'}
        </h1>
        <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
          {verifyEmail.isPending ? 'Please wait while we confirm your email.' : verifyEmail.isSuccess ? 'Your account is ready. You can now sign in.' : verifyEmail.error?.message ?? 'The verification link is missing or expired.'}
        </p>
        {verifyEmail.isSuccess ? <Link className="mt-8 inline-flex h-11 w-full items-center justify-center bg-accent-gold px-6 text-xs font-medium uppercase tracking-[0.1em] text-text-inverse" href={ROUTES.login}>Continue to Sign In</Link> : null}
      </section>
    </main>
  );
}
