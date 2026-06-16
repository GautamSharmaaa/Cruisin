// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAddressBook, useCreateAddress } from '@/hooks/useAccount';
import { addressBookSchema } from '@/lib/schemas';

type AddressForm = z.infer<typeof addressBookSchema>;

export default function AddressesPage(): ReactNode {
  const addresses = useAddressBook();
  const createAddress = useCreateAddress();
  const { register, handleSubmit, formState, reset } = useForm<AddressForm>({ resolver: zodResolver(addressBookSchema), defaultValues: { type: 'home', country: COPY.fields.defaultCountry, isDefault: false } });
  const onSubmit = (data: AddressForm): void => { createAddress.mutate(data, { onSuccess: () => reset({ type: 'home', country: COPY.fields.defaultCountry, isDefault: false }) }); };
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><div className="mx-auto max-w-[1200px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p><h1 className="mt-4 font-display text-4xl">{COPY.account.addresses}</h1><div className="mt-10 grid gap-10 lg:grid-cols-[1fr_460px]"><section className="grid content-start gap-px bg-border">{addresses.data?.map((address) => <article key={address._id} className="bg-background-elevated p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl text-text-primary">{address.type}</h2>{address.isDefault ? <span className="font-mono text-xs uppercase text-accent-gold">{COPY.account.default}</span> : null}</div><p className="mt-3 text-sm text-text-primary">{address.fullName}</p><p className="mt-2 text-sm leading-6 text-text-secondary">{address.street}, {address.landmark ? address.landmark + ', ' : ''}{address.city}, {address.state}, {address.pincode}</p><p className="mt-2 text-sm text-text-secondary">{address.phone}</p></article>)}</section><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6"><Input label={COPY.fields.addressType} error={formState.errors.type?.message} {...register('type')} /><Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.fields.street} error={formState.errors.street?.message} {...register('street')} /><Input label={COPY.fields.landmark} error={formState.errors.landmark?.message} {...register('landmark')} /><Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={formState.errors.pincode?.message} {...register('pincode')} /><Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} /><Button type="submit" isLoading={createAddress.isPending}>{COPY.account.save}</Button></form></div></div></main>;
}
