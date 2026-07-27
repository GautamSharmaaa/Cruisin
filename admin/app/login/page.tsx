// Governed by .rules v1.0
'use client';

import { GoogleLogin } from '@react-oauth/google';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_AUTH_COPY } from '@/constants/auth-copy';
import { IDENTITY_CONFIG } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useAdminGoogleLogin, useAdminLogin } from '@/hooks/useAdminAuth';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage(): ReactNode {
  const login = useAdminLogin();
  const googleLogin = useAdminGoogleLogin();
  const [googleError, setGoogleError] = useState('');
  const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const onSubmit = (data: LoginForm): void => { login.mutate(data); };
  const error = googleError || googleLogin.error?.message || login.error?.message;
  return (
    <main className="mx-auto max-w-md px-6 py-32">
      <h1 className="font-display text-4xl">{COPY.auth.login}</h1>
      <div className="mt-8 flex min-h-16 justify-center border border-border bg-background-elevated p-2">
        {IDENTITY_CONFIG.googleClientId ? <GoogleLogin width="320" theme="filled_black" shape="rectangular" text="continue_with" onSuccess={(response) => { setGoogleError(''); if (response.credential) googleLogin.mutate(response.credential); else setGoogleError(ADMIN_AUTH_COPY.googleFailed); }} onError={() => setGoogleError(ADMIN_AUTH_COPY.googleFailed)} /> : <p className="self-center text-sm text-text-muted">{ADMIN_AUTH_COPY.googleUnavailable}</p>}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-text-muted"><span className="h-px flex-1 bg-border" /><span>{ADMIN_AUTH_COPY.divider}</span><span className="h-px flex-1 bg-border" /></div>
      <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} />
        <Input label={COPY.auth.password} type="password" error={formState.errors.password?.message} {...register('password')} />
        {error ? <p className="text-sm text-danger" aria-live="polite">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={login.isPending || googleLogin.isPending}>{login.isPending || googleLogin.isPending ? COPY.common.loading : COPY.auth.submit}</Button>
      </form>
    </main>
  );
}
