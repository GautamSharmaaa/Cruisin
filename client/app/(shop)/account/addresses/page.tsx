// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAddAddress, useMe } from '@/hooks/useAccount';
import { savedAddressSchema } from '@/lib/schemas';

type AddressForm = z.infer<typeof savedAddressSchema>;

export default function AccountPage(): ReactNode { const me = useMe(); const addAddress = useAddAddress(); const { register, handleSubmit, formState } = useForm<AddressForm>({ resolver: zodResolver(savedAddressSchema), defaultValues: { country: COPY.fields.defaultCountry, isDefault: false } }); const onSubmit = (data: AddressForm): void => { addAddress.mutate(data); }; return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.addresses}</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]"><section className="grid gap-4">{(me.data?.addresses ?? []).map((address) => <article key={address.id ?? address._id ?? address.label} className="border border-border p-4"><h2 className="font-display text-xl">{address.label}</h2><p className="mt-2 text-text-secondary">{address.line1}, {address.city}, {address.postalCode}</p></article>)}</section><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border p-6"><Input label={COPY.fields.label} error={formState.errors.label?.message} {...register('label')} /><Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.checkout.address} error={formState.errors.line1?.message} {...register('line1')} /><Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={formState.errors.postalCode?.message} {...register('postalCode')} /><Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} /><Button type="submit" isLoading={addAddress.isPending}>{COPY.account.save}</Button></form></div></main>; }
