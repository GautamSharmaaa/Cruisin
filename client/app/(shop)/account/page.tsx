// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useDeleteAccount, useMe, useUpdateProfile } from '@/hooks/useAccount';
import { profileSchema } from '@/lib/schemas';

type ProfileForm = z.infer<typeof profileSchema>;

export default function AccountPage(): ReactNode { const me = useMe(); const update = useUpdateProfile(); const deleteAccount = useDeleteAccount(); const { register, handleSubmit, formState, reset } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) }); useEffect(() => { if (me.data) reset({ name: me.data.name, email: me.data.email, phone: me.data.phone }); }, [me.data, reset]); const onSubmit = (data: ProfileForm): void => { update.mutate(data); }; return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.profile}</h1><form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid max-w-2xl gap-4"><Input label={COPY.auth.name} error={formState.errors.name?.message} {...register('name')} /><Input label={COPY.auth.email} error={formState.errors.email?.message} {...register('email')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} />{update.isSuccess ? <p className="text-sm text-success">{COPY.account.saved}</p> : null}<Button type="submit" isLoading={update.isPending}>{COPY.account.save}</Button><Button type="button" variant="danger" onClick={() => deleteAccount.mutate()}>{COPY.account.delete}</Button></form></main>; }
