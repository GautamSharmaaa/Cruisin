// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAdminLogin } from '@/hooks/useAdminAuth';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage(): ReactNode { const login = useAdminLogin(); const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) }); const onSubmit = (data: LoginForm): void => { login.mutate(data); }; return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.login}</h1><form method="post" onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4"><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.auth.password} type="password" error={formState.errors.password?.message} {...register('password')} />{login.error ? <p className="text-sm text-danger" aria-live="polite">{login.error.message}</p> : null}<Button type="submit" className="w-full">{login.isPending ? COPY.common.loading : COPY.auth.submit}</Button></form></main>; }
