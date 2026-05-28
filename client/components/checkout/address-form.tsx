// Governed by .rules v1.0
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import type { z } from 'zod';
import type { addressSchema } from '@/lib/schemas';

type AddressFormValues = z.infer<typeof addressSchema>;
export interface AddressFormProps { register: UseFormRegister<AddressFormValues>; errors: FieldErrors<AddressFormValues>; }
export function AddressForm({ register, errors }: AddressFormProps): ReactNode { return <div className="grid gap-4 md:grid-cols-2"><Input label={COPY.fields.fullName} error={errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={errors.phone?.message} {...register('phone')} /><Input label={COPY.checkout.address} error={errors.line1?.message} {...register('line1')} className="md:col-span-2" /><Input label={COPY.fields.city} error={errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={errors.postalCode?.message} {...register('postalCode')} /><Input label={COPY.fields.country} error={errors.country?.message} {...register('country')} /></div>; }
