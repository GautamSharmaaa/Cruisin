// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { registerSchema } from '@/lib/schemas';

type RegisterForm = z.infer<typeof registerSchema>;
export default function RegisterPage(): ReactNode { const { register, handleSubmit, formState } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) }); const onSubmit = (_data: RegisterForm): void => {}; return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.register}</h1><form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4"><Input label={COPY.auth.name} error={formState.errors.name?.message} {...register('name')} /><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.auth.password} type="password" error={formState.errors.password?.message} {...register('password')} /><Input label={COPY.auth.confirmPassword} type="password" error={formState.errors.confirmPassword?.message} {...register('confirmPassword')} /><Button type="submit" className="w-full">{COPY.auth.submit}</Button></form></main>; }
