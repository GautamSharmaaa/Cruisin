// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useForgotPassword } from '@/hooks/useAuth';
import { forgotPasswordSchema } from '@/lib/schemas';

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage(): ReactNode { const forgot = useForgotPassword(); const { register, handleSubmit, formState } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) }); const onSubmit = (data: ForgotPasswordForm): void => { forgot.mutate(data); }; return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.forgot}</h1><form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4"><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} />{forgot.isSuccess ? <p className="text-sm text-success" aria-live="polite">{COPY.auth.resetSent}</p> : null}{forgot.error ? <p className="text-sm text-danger" aria-live="polite">{forgot.error.message}</p> : null}<Button type="submit" className="w-full" isLoading={forgot.isPending}>{COPY.auth.submit}</Button></form></main>; }
