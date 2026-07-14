// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useAddressBook, useCreateAddress, useDeleteAddress, useUpdateAddress } from '@/hooks/useAccount';
import { addressBookSchema } from '@/lib/schemas';
import type { AddressBookEntry } from '@/types/user.types';

type AddressForm = z.infer<typeof addressBookSchema>;

const emptyAddress: AddressForm = {
  type: 'home',
  fullName: '',
  phone: '',
  street: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: COPY.fields.defaultCountry,
  isDefault: false
};

export default function AddressesPage(): ReactNode {
  const addresses = useAddressBook();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<AddressForm>({ resolver: zodResolver(addressBookSchema), defaultValues: emptyAddress });

  const clearEditor = (): void => {
    setEditingId(null);
    reset(emptyAddress);
  };
  const startEdit = (address: AddressBookEntry): void => {
    setEditingId(address._id);
    reset({
      type: address.type,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      landmark: address.landmark ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      isDefault: address.isDefault
    });
  };
  const onSubmit = (data: AddressForm): void => {
    if (editingId) {
      updateAddress.mutate({ addressId: editingId, input: data }, { onSuccess: clearEditor });
      return;
    }
    createAddress.mutate(data, { onSuccess: clearEditor });
  };
  const isSaving = createAddress.isPending || updateAddress.isPending;
  const hasError = createAddress.isError || updateAddress.isError || deleteAddress.isError;
  const wasSaved = createAddress.isSuccess || updateAddress.isSuccess;

  return <main className="px-6 py-28 lg:px-20 lg:py-36">
    <div className="mx-auto max-w-[1200px]">
      <p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p>
      <h1 className="mt-4 font-display text-4xl">{COPY.account.addresses}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_460px]">
        <section className="grid content-start gap-px bg-border">
          {addresses.data?.map((address) => <article key={address._id} className="bg-background-elevated p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl capitalize text-text-primary">{address.type}</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {address.isDefault ? <span className="font-mono text-xs uppercase text-accent-gold">{COPY.account.default}</span> : null}
                <Button type="button" variant="ghost" disabled={isSaving} onClick={() => startEdit(address)}>Edit</Button>
                {confirmDeleteId === address._id ? <>
                  <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Keep</Button>
                  <Button type="button" variant="secondary" disabled={deleteAddress.isPending} onClick={() => deleteAddress.mutate(address._id, { onSuccess: () => { setConfirmDeleteId(null); if (editingId === address._id) clearEditor(); } })}>Confirm remove</Button>
                </> : <Button type="button" variant="ghost" disabled={deleteAddress.isPending} onClick={() => setConfirmDeleteId(address._id)}>Remove</Button>}
              </div>
            </div>
            <p className="mt-3 text-sm text-text-primary">{address.fullName}</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{address.street}, {address.landmark ? address.landmark + ', ' : ''}{address.city}, {address.state}, {address.pincode}</p>
            <p className="mt-2 text-sm text-text-secondary">{address.phone}</p>
          </article>)}
        </section>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl text-text-primary">{editingId ? 'Edit address' : 'Add address'}</h2>{editingId ? <Button type="button" variant="ghost" onClick={clearEditor}>Cancel edit</Button> : null}</div>
          <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary" htmlFor="address-type"><span>{COPY.fields.addressType}</span><select id="address-type" className="mt-2 h-12 w-full border border-border-subtle bg-background-input px-4 text-base text-text-primary" {...register('type')}><option value="home">Home</option><option value="office">Office</option><option value="other">Other</option></select></label>
          <Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} />
          <Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} />
          <Input label={COPY.fields.street} error={formState.errors.street?.message} {...register('street')} />
          <Input label={COPY.fields.landmark} error={formState.errors.landmark?.message} {...register('landmark')} />
          <Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} />
          <Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} />
          <Input label={COPY.fields.postalCode} error={formState.errors.pincode?.message} {...register('pincode')} />
          <Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} />
          <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="checkbox" className="h-4 w-4 accent-accent-gold" {...register('isDefault')} />Make this my default address</label>
          {wasSaved ? <p className="text-sm text-success" role="status">Address saved.</p> : null}
          {hasError ? <p className="text-sm text-danger" role="alert">We couldn&apos;t update your addresses. Try again.</p> : null}
          <Button type="submit" isLoading={isSaving}>{editingId ? 'Update address' : COPY.account.save}</Button>
        </form>
      </div>
    </div>
  </main>;
}
