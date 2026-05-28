// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { OrderSummary } from '@/components/checkout/order-summary';
import { PaymentGateway } from '@/components/checkout/payment-gateway';
import { ShippingMethod } from '@/components/checkout/shipping-method';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { useCheckout } from '@/hooks/useCheckout';
import { checkoutPageSchema } from '@/lib/schemas';

type CheckoutForm = z.infer<typeof checkoutPageSchema>;
export default function CheckoutPage(): ReactNode {
  const router = useRouter();
  const checkout = useCheckout();
  const { register, handleSubmit, formState, watch, setValue } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutPageSchema), defaultValues: { country: COPY.fields.defaultCountry, paymentMethod: 'razorpay', shippingMethod: 'standard' } });
  const onSubmit = (data: CheckoutForm): void => {
    const address = { fullName: data.fullName, phone: data.phone, line1: data.line1, line2: data.line2, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country };
    checkout.mutate({ shippingAddress: address, billingAddress: address, paymentMethod: data.paymentMethod }, { onSuccess: (result) => router.push('/checkout/success?order=' + (result.order.id ?? result.order._id ?? result.payment.id) + '&payment=' + result.payment.id + '&provider=' + result.payment.provider) });
  };
  return <main className="px-6 py-24 lg:px-20"><h1 className="font-display text-4xl">{COPY.checkout.title}</h1><div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]"><form onSubmit={handleSubmit(onSubmit)} className="space-y-10"><CheckoutProgress step={2} /><section><h2 className="mb-4 font-display text-2xl">{COPY.checkout.address}</h2><div className="grid gap-4 md:grid-cols-2"><Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.checkout.address} className="md:col-span-2" error={formState.errors.line1?.message} {...register('line1')} /><Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={formState.errors.postalCode?.message} {...register('postalCode')} /><Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} /></div></section><section><h2 className="mb-4 font-display text-2xl">{COPY.checkout.methods}</h2><ShippingMethod value={watch('shippingMethod')} onChange={(value) => setValue('shippingMethod', value)} /></section><section><h2 className="mb-4 font-display text-2xl">{COPY.checkout.paymentMethod}</h2><PaymentGateway value={watch('paymentMethod')} onChange={(value) => setValue('paymentMethod', value)} /></section>{checkout.error ? <p className="text-sm text-danger" aria-live="polite">{checkout.error.message}</p> : null}<Button type="submit" isLoading={checkout.isPending}>{COPY.checkout.placeOrder}</Button></form><OrderSummary /></div></main>;
}
