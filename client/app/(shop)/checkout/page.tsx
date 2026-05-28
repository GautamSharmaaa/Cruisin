// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { OrderSummary } from '@/components/checkout/order-summary';
import { PaymentGateway } from '@/components/checkout/payment-gateway';
import { ShippingMethod } from '@/components/checkout/shipping-method';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { checkoutSchema } from '@/lib/schemas';

type CheckoutForm = z.infer<typeof checkoutSchema>;
export default function CheckoutPage(): ReactNode { const router = useRouter(); const [shipping, setShipping] = useState<'standard' | 'express'>('standard'); const [payment, setPayment] = useState<'razorpay' | 'stripe'>('razorpay'); const { handleSubmit } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) }); const onSubmit = (): void => { router.push('/checkout/success?order=CRSN-0428'); }; return <main className="px-6 py-24 lg:px-20"><h1 className="font-display text-4xl">{COPY.checkout.title}</h1><div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]"><form onSubmit={handleSubmit(onSubmit)} className="space-y-10"><CheckoutProgress step={2} /><section><h2 className="mb-4 font-display text-2xl">{COPY.checkout.methods}</h2><ShippingMethod value={shipping} onChange={setShipping} /></section><section><h2 className="mb-4 font-display text-2xl">{COPY.checkout.paymentMethod}</h2><PaymentGateway value={payment} onChange={setPayment} /></section><Button type="submit">{COPY.checkout.placeOrder}</Button></form><OrderSummary /></div></main>; }
