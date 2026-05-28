// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { loginSchema } from '@/lib/schemas';

type LoginForm = z.infer<typeof loginSchema>;
export default function LoginPage(): ReactNode { const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) }); const onSubmit = (_data: LoginForm): void => {}; return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.login}</h1><form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4"><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.auth.password} type="password" error={formState.errors.password?.message} {...register('password')} /><Button type="submit" className="w-full">{COPY.auth.submit}</Button></form></main>; }
