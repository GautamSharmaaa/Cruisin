// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useResetPassword } from '@/hooks/useAuth';
import { resetPasswordSchema } from '@/lib/schemas';

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage(): ReactNode { const searchParams = useSearchParams(); const reset = useResetPassword(); const { register, handleSubmit, formState } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: searchParams.get('token') ?? '' } }); const onSubmit = (data: ResetPasswordForm): void => { reset.mutate({ token: data.token, password: data.password }); }; return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.reset}</h1><form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4"><Input label={COPY.auth.token} error={formState.errors.token?.message} {...register('token')} /><Input label={COPY.auth.password} type="password" error={formState.errors.password?.message} {...register('password')} /><Input label={COPY.auth.confirmPassword} type="password" error={formState.errors.confirmPassword?.message} {...register('confirmPassword')} />{reset.isSuccess ? <p className="text-sm text-success" aria-live="polite">{COPY.auth.resetComplete}</p> : null}{reset.error ? <p className="text-sm text-danger" aria-live="polite">{reset.error.message}</p> : null}<Button type="submit" className="w-full" isLoading={reset.isPending}>{COPY.auth.submit}</Button></form></main>; }
