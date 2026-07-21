'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { OrderSummary } from '@/components/checkout/order-summary';
import { PaymentGateway, type PaymentConfiguration } from '@/components/checkout/payment-gateway';
import { ShippingMethod } from '@/components/checkout/shipping-method';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { clearCheckoutAttempt, useCheckout } from '@/hooks/useCheckout';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { cinematicPanel, staggerContainer } from '@/lib/animations';
import { api } from '@/lib/api';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { loadRazorpay, razorpayPrefillContact, type RazorpaySuccess } from '@/lib/razorpay';
import { checkoutPageSchema } from '@/lib/schemas';
import { calculateShippingCharge } from '@/lib/shipping';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { Order } from '@/types/order.types';

type CheckoutForm = z.infer<typeof checkoutPageSchema>;
const getOrderId = (order: { _id?: string; id?: string }): string => order.id ?? order._id ?? '';

export default function CheckoutPage(): ReactNode {
  const router = useRouter();
  const checkout = useCheckout();
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const siteSettings = useSiteSettings();
  const { register, handleSubmit, formState, watch, setValue } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutPageSchema), defaultValues: { country: COPY.fields.defaultCountry, paymentMethod: 'razorpay', shippingMethod: 'standard' } });
  const selectedShipping = watch('shippingMethod');
  const cartItems = useCartStore((state) => state.items);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const subtotal = cartItems.filter((item) => isCustomerVisibleProduct(item.product)).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const shipping = calculateShippingCharge(discountedSubtotal, freeShipping, selectedShipping, siteSettings.data);
  const orderTotal = discountedSubtotal + shipping + Math.round(discountedSubtotal * 0.18);
  const paymentConfig = useQuery({ queryKey: ['payments', 'config'], queryFn: async (): Promise<PaymentConfiguration> => (await api.get<ApiEnvelope<PaymentConfiguration>>('/payments/config')).data.data, staleTime: 60_000 });
  const [paymentMessage, setPaymentMessage] = useState('');
  const selectedPayment = watch('paymentMethod');
  useEffect(() => {
    const config = paymentConfig.data;
    if (!config) return;
    if (selectedPayment === 'cod' && (!config.codEnabled || orderTotal > config.maxCodOrderValue)) setValue('paymentMethod', 'razorpay');
    if (selectedPayment === 'partial' && (!config.partialPaymentEnabled || orderTotal < config.minPartialPaymentOrderValue)) setValue('paymentMethod', 'razorpay');
  }, [orderTotal, paymentConfig.data, selectedPayment, setValue]);
  const finish = (order: { _id?: string; id?: string; orderNumber?: string; paymentMode?: string; amountPaid?: number; amountDue?: number }, state: 'success' | 'failure'): void => { const id = getOrderId(order); if (state === 'success') { clearCheckoutAttempt(); useCartStore.getState().clearCart(); } const query = new URLSearchParams({ order: id }); if (order.orderNumber) query.set('number', order.orderNumber); if (order.paymentMode) query.set('mode', order.paymentMode); if (typeof order.amountPaid === 'number') query.set('paid', String(order.amountPaid)); if (typeof order.amountDue === 'number') query.set('due', String(order.amountDue)); router.push(`/checkout/${state}?${query.toString()}`); };
  const verify = async (response: RazorpaySuccess, localOrderId: string): Promise<void> => { try { const result = await api.post<ApiEnvelope<{ verified: boolean; order?: Order }>>('/payments/razorpay/verify', { method: 'razorpay', payload: response }); if (!result.data.data.verified) throw new Error('We could not verify this payment.'); finish(result.data.data.order ?? { _id: localOrderId }, 'success'); } catch { setPaymentMessage(COPY.checkout.pendingBody); router.push(ROUTES.checkoutPending + '?order=' + encodeURIComponent(localOrderId)); } };
  const openRazorpay = async (orderId: string, providerOrderId: string, amount: number, data: CheckoutForm): Promise<void> => { const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID; if (!key) throw new Error('Online payments are not configured for this storefront.'); await loadRazorpay(); const contact = razorpayPrefillContact(data.phone, paymentConfig.data?.paymentMode) ?? razorpayPrefillContact(user?.phone, paymentConfig.data?.paymentMode); const razorpay = new window.Razorpay!({ key, amount: Math.round(amount * 100), currency: 'INR', name: 'CRUISIN', description: 'Private client order', order_id: providerOrderId, prefill: { name: data.fullName || user?.name, email: user?.email, contact }, handler: (response) => { void verify(response, orderId); }, modal: { ondismiss: () => { setPaymentMessage('Payment window closed. Your order is still pending; you may retry securely.'); router.push(`/checkout/failure?order=${encodeURIComponent(orderId)}`); } }, theme: { color: '#b89b5e' } }); razorpay.on('payment.failed', (response) => { razorpay.close(); setPaymentMessage(response.error?.description ?? 'Payment was not completed.'); router.push(`/checkout/failure?order=${encodeURIComponent(orderId)}`); }); razorpay.open(); };
  const onSubmit = (data: CheckoutForm): void => { if (!user) return; setPaymentMessage(''); const address = { fullName: data.fullName, phone: data.phone, line1: data.line1, line2: data.line2, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country }; const paymentMode = data.paymentMethod === 'cod' ? 'cod' : data.paymentMethod === 'partial' ? 'partial' : 'online'; checkout.mutate({ shippingAddress: address, billingAddress: address, paymentMethod: 'razorpay', paymentMode, shippingMethod: data.shippingMethod }, { onSuccess: (result) => { const id = getOrderId(result.order); if (paymentMode === 'cod') { finish(result.order, 'success'); return; } if (!result.payment?.id) { setPaymentMessage('A payment session could not be created. Please retry.'); return; } void openRazorpay(id, result.payment.id, result.amountToPay, data).catch((error: unknown) => setPaymentMessage(error instanceof Error ? error.message : 'Secure checkout could not be opened.')); } }); };
  if (!isAuthInitialized) return <main className="min-h-dvh px-6 py-32 lg:px-20" aria-busy="true"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private checkout</p><div className="mt-6 h-12 max-w-md animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><p className="mt-6 text-sm text-text-secondary" aria-live="polite">{COPY.auth.checkingSession}</p></section></main>;
  if (!user) return <main className="px-6 py-32 lg:px-20"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private checkout</p><h1 className="mt-4 font-display text-4xl text-text-primary">Sign in to place your order</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-secondary">Create an account or sign in to continue checkout. Your cart will be waiting for you.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href={ROUTES.login + '?redirect=' + encodeURIComponent(ROUTES.checkout)} className="inline-flex h-11 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse">Sign in</Link><Link href={ROUTES.register + '?redirect=' + encodeURIComponent(ROUTES.checkout)} className="inline-flex h-11 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary">Create account</Link></div><Link href={ROUTES.shop} className="mt-5 inline-flex text-xs uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary">Continue shopping</Link></section></main>;
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><motion.div variants={staggerContainer} initial="initial" animate="animate" className="mx-auto max-w-[1440px]"><motion.div variants={cinematicPanel} className="max-w-4xl"><p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">{COPY.checkout.eyebrow}</p><h1 className="mt-4 font-display text-5xl font-light text-text-primary md:text-hero">{COPY.checkout.title}</h1><p className="mt-6 max-w-2xl text-base text-text-secondary">{COPY.checkout.body}</p></motion.div><div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px]"><motion.form variants={cinematicPanel} onSubmit={handleSubmit(onSubmit)} className="space-y-10 border border-border bg-background-primary/50 p-5 shadow-lg backdrop-blur-xl md:p-8"><CheckoutProgress step={2} /><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.address}</h2><div className="grid gap-4 md:grid-cols-2"><Input label={COPY.fields.fullName} error={formState.errors.fullName?.message} {...register('fullName')} /><Input label={COPY.fields.phone} error={formState.errors.phone?.message} {...register('phone')} /><Input label={COPY.checkout.address} className="md:col-span-2" error={formState.errors.line1?.message} {...register('line1')} /><Input label={COPY.fields.city} error={formState.errors.city?.message} {...register('city')} /><Input label={COPY.fields.state} error={formState.errors.state?.message} {...register('state')} /><Input label={COPY.fields.postalCode} error={formState.errors.postalCode?.message} {...register('postalCode')} /><Input label={COPY.fields.country} error={formState.errors.country?.message} {...register('country')} /></div></section><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.methods}</h2><ShippingMethod value={selectedShipping} discountedSubtotal={discountedSubtotal} freeShipping={freeShipping} settings={siteSettings.data} onChange={(value) => setValue('shippingMethod', value)} /></section><section><h2 className="mb-5 font-display text-3xl font-light">{COPY.checkout.paymentMethod}</h2><PaymentGateway value={selectedPayment} onChange={(value) => setValue('paymentMethod', value)} config={paymentConfig.data} orderTotal={orderTotal} /></section>{checkout.error || paymentMessage ? <p className="text-sm text-danger" aria-live="polite">{paymentMessage || checkout.error?.message}</p> : null}<Button type="submit" className="w-full md:w-auto" isLoading={checkout.isPending} disabled={!user || paymentConfig.isLoading || siteSettings.isLoading}>{selectedPayment === 'cod' ? 'Place COD order' : selectedPayment === 'partial' ? 'Pay advance securely' : 'Continue to secure payment'}</Button></motion.form><motion.div variants={cinematicPanel}><OrderSummary shippingMethod={selectedShipping} shippingSettings={siteSettings.data} /></motion.div></div></motion.div></main>;
}
