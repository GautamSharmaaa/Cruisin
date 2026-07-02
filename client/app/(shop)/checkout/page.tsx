// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
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
import { cinematicPanel, staggerContainer } from '@/lib/animations';
import { checkoutPageSchema } from '@/lib/schemas';
import { useCartStore } from '@/store/cartStore';

type CheckoutForm = z.infer<typeof checkoutPageSchema>;
export default function CheckoutPage(): ReactNode {
  const router = useRouter();
  const checkout = useCheckout();
  const { register, handleSubmit, formState, watch, setValue } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutPageSchema), defaultValues: { country: COPY.fields.defaultCountry, paymentMethod: 'razorpay', shippingMethod: 'standard' } });
  const onSubmit = (data: CheckoutForm): void => {
    const address = { fullName: data.fullName, phone: data.phone, line1: data.line1, line2: data.line2, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country };
    checkout.mutate({ shippingAddress: address, billingAddress: address, paymentMethod: data.paymentMethod }, { onSuccess: (result) => { useCartStore.getState().clearCart(); router.push('/checkout/success?order=' + (result.order.id ?? result.order._id ?? result.payment.id) + '&payment=' + result.payment.id + '&provider=' + result.payment.provider); } });
  };
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><motion.div variants={staggerContainer} initial="initial" animate="animate" className="mx-auto max-w-[1440px]"><motion.div variants={cinematicPanel} className="max-w-4xl"><p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">{COPY.checkout.eyebrow}</p><h1 className="mt-4 font-display text-5xl font-light text-text-primary md:text-hero">{COPY.checkout.title}</h1><p className="mt-6 max-w-2xl text-base text-text-secondary">{COPY.checkout.body}</p></motion.div><div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px]"><motion.form variants={cinematicPanel} onSubmit={handleSubmit(onSubmit)} className="space-y-10 border border-border bg-background-primary/50 p-5 shadow-lg backdrop-blur-xl md:p-8"><CheckoutProgress step={2} /><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.address}</h2><div className="grid gap-4 md:grid-cols-2"><Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.checkout.address} className="md:col-span-2" error={formState.errors.line1?.message} {...register('line1')} /><Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={formState.errors.postalCode?.message} {...register('postalCode')} /><Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} /></div></section><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.methods}</h2><ShippingMethod value={watch('shippingMethod')} onChange={(value) => setValue('shippingMethod', value)} /></section><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.paymentMethod}</h2><PaymentGateway value={watch('paymentMethod')} onChange={(value) => setValue('paymentMethod', value)} /></section>{checkout.error ? <p className="text-sm text-danger" aria-live="polite">{checkout.error.message}</p> : null}<Button type="submit" className="w-full md:w-auto" isLoading={checkout.isPending}>{COPY.checkout.placeOrder}</Button></motion.form><motion.div variants={cinematicPanel}><OrderSummary /></motion.div></div></motion.div></main>;
}
