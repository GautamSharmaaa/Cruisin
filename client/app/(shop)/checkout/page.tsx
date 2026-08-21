'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { CheckoutFlowHeader } from '@/components/checkout/checkout-flow-header';
import { AddressBottomSheet } from '@/components/checkout/address-bottom-sheet';
import { OffersRewards } from '@/components/checkout/offers-rewards';
import { OrderSummary } from '@/components/checkout/order-summary';
import { PaymentGateway, type PaymentConfiguration } from '@/components/checkout/payment-gateway';
import { CheckoutPromotionStrip } from '@/components/promotion/checkout-promotion-strip';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { clearCheckoutAttempt, useCheckout } from '@/hooks/useCheckout';
import { useAddressBook } from '@/hooks/useAccount';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { useCartRecommendations } from '@/hooks/useCartRecommendations';
import { useLogisticsQuote } from '@/hooks/useLogistics';
import { cinematicPanel, staggerContainer } from '@/lib/animations';
import { api } from '@/lib/api';
import { taxInclusiveCheckoutTotals } from '@/lib/checkout-totals';
import { combinedCartDiscount, recommendationBundleDiscount } from '@/lib/bundle-discount';
import { checkoutPaymentSessionIssue } from '@/lib/checkout-payment';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { clearMetaCheckoutAttempt, getOrCreateCheckoutEventId, trackCheckoutPaymentSelected, trackCheckoutStarted } from '@/lib/meta-ecommerce';
import { loadRazorpay, razorpayPrefillContact, type RazorpaySuccess } from '@/lib/razorpay';
import { checkoutPageSchema } from '@/lib/schemas';
import { calculateShippingCharge } from '@/lib/shipping';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { Order } from '@/types/order.types';
import type { AddressBookEntry } from '@/types/user.types';

type CheckoutForm = z.infer<typeof checkoutPageSchema>;
const getOrderId = (order: { _id?: string; id?: string }): string => order.id ?? order._id ?? '';

export default function CheckoutPage(): ReactNode {
  const router = useRouter();
  const { openMobileAuth } = useMobileAuthSheet();
  const checkout = useCheckout();
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const siteSettings = useSiteSettings();
  const addressBook = useAddressBook(Boolean(user));
  const addresses = useMemo(() => Array.isArray(addressBook.data) ? addressBook.data : [], [addressBook.data]);
  const { handleSubmit, formState, watch, setValue } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutPageSchema), defaultValues: { country: COPY.fields.defaultCountry, paymentMethod: 'razorpay', shippingMethod: 'standard' } });
  const addressPrefilled = useRef(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [addressConfirmation, setAddressConfirmation] = useState(false);
  const selectedShipping = watch('shippingMethod');
  const selectedPayment = watch('paymentMethod');
  const postcode = watch('postalCode') ?? '';
  const logisticsQuote = useLogisticsQuote(postcode, selectedPayment === 'cod' ? 'cod' : 'prepaid');
  const cartItems = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const freeShipping = useCartStore((state) => state.freeShipping);
  const visibleCartItems = cartItems.filter((item) => isCustomerVisibleProduct(item.product));
  const subtotal = visibleCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const recommendations = useCartRecommendations(Array.from(new Set(visibleCartItems.map((item) => item.product.id))), visibleCartItems.length > 0);
  const automaticDiscounts = combinedCartDiscount(visibleCartItems, couponDiscount, subtotal, recommendationBundleDiscount(visibleCartItems, recommendations.data));
  const discountedSubtotal = taxInclusiveCheckoutTotals(subtotal, automaticDiscounts.totalDiscount, 0).discountedSubtotal;
  const quotedShipping = logisticsQuote.data?.options.find((option) => option.code === selectedShipping)?.shippingCharge;
  const shipping = freeShipping ? 0 : quotedShipping ?? calculateShippingCharge(discountedSubtotal, freeShipping, selectedShipping, siteSettings.data);
  const paymentConfig = useQuery({ queryKey: ['payments', 'config'], queryFn: async (): Promise<PaymentConfiguration> => (await api.get<ApiEnvelope<PaymentConfiguration>>('/payments/config')).data.data, staleTime: 60_000 });
  const codFee = selectedPayment === 'cod' && paymentConfig.data?.codEnabled ? paymentConfig.data.codFee : 0;
  const orderTotal = taxInclusiveCheckoutTotals(subtotal, automaticDiscounts.totalDiscount, shipping + codFee).total;
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId) ?? addresses.find((address) => address.isDefault) ?? addresses[0];
  const [paymentMessage, setPaymentMessage] = useState('');
  const applyAddress = (address: AddressBookEntry, confirm = false): void => {
    setSelectedAddressId(address._id);
    setValue('fullName', address.fullName);
    setValue('phone', address.phone);
    setValue('line1', address.street);
    setValue('line2', address.landmark ?? '');
    setValue('city', address.city);
    setValue('state', address.state);
    setValue('postalCode', address.pincode);
    setValue('country', address.country);
    if (confirm) {
      setAddressConfirmation(true);
      window.setTimeout(() => setAddressConfirmation(false), 1800);
    }
  };
  const applySavedAddress = (addressId: string): void => {
    const address = addresses.find((candidate) => candidate._id === addressId);
    if (address) applyAddress(address);
  };
  useEffect(() => {
    if (!user || addressPrefilled.current || !addressBook.isSuccess || formState.isDirty) return;
    const saved = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (saved) applySavedAddress(saved._id);
    else {
      if (user.name) setValue('fullName', user.name);
      if (user.phone) setValue('phone', user.phone);
    }
    addressPrefilled.current = true;
  }, [addressBook.isSuccess, addresses, formState.isDirty, setValue, user]);
  useEffect(() => {
    const config = paymentConfig.data;
    if (!config) return;
    if (selectedPayment === 'cod' && (!config.codEnabled || orderTotal > config.maxCodOrderValue)) setValue('paymentMethod', 'razorpay');
    if (selectedPayment === 'partial' && (!config.partialPaymentEnabled || orderTotal < config.minPartialPaymentOrderValue)) setValue('paymentMethod', 'razorpay');
  }, [orderTotal, paymentConfig.data, selectedPayment, setValue]);
  useEffect(() => {
    if (logisticsQuote.data?.options.length && !logisticsQuote.data.options.some((option) => option.code === selectedShipping)) {
      setValue('shippingMethod', logisticsQuote.data.options[0]?.code ?? 'standard');
    }
  }, [logisticsQuote.data, selectedShipping, setValue]);
  useEffect(() => {
    if (!user || visibleCartItems.length === 0) return;
    trackCheckoutStarted({ items: visibleCartItems, value: orderTotal, coupon });
  }, [coupon, orderTotal, user, visibleCartItems]);
  const finish = (order: { _id?: string; id?: string; orderNumber?: string; paymentMode?: string; amountPaid?: number; amountDue?: number }, state: 'success' | 'failure'): void => { const id = getOrderId(order); if (state === 'success') { clearCheckoutAttempt(); clearMetaCheckoutAttempt(); useCartStore.getState().clearCart(); } const query = new URLSearchParams({ order: id }); if (order.orderNumber) query.set('number', order.orderNumber); if (order.paymentMode) query.set('mode', order.paymentMode); if (typeof order.amountPaid === 'number') query.set('paid', String(order.amountPaid)); if (typeof order.amountDue === 'number') query.set('due', String(order.amountDue)); router.push(`/checkout/${state}?${query.toString()}`); };
  const verify = async (response: RazorpaySuccess, localOrderId: string): Promise<void> => { try { const result = await api.post<ApiEnvelope<{ verified: boolean; order?: Order }>>('/payments/razorpay/verify', { method: 'razorpay', payload: response }); if (!result.data.data.verified) throw new Error('We could not verify this payment.'); finish(result.data.data.order ?? { _id: localOrderId }, 'success'); } catch { setPaymentMessage(COPY.checkout.pendingBody); router.push(ROUTES.checkoutPending + '?order=' + encodeURIComponent(localOrderId)); } };
  const openRazorpay = async (orderId: string, providerOrderId: string, amount: number, data: CheckoutForm): Promise<void> => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) throw new Error('Online payments are not configured for this storefront.');
    await loadRazorpay();
    const contact = razorpayPrefillContact(data.phone, paymentConfig.data?.paymentMode) ?? razorpayPrefillContact(user?.phone, paymentConfig.data?.paymentMode);
    let paymentOutcomeHandled = false;
    const razorpay = new window.Razorpay!({
      key,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'CRUISIN',
      description: 'Private client order',
      order_id: providerOrderId,
      prefill: { name: data.fullName || user?.name, email: user?.email, contact },
      handler: (response) => {
        if (paymentOutcomeHandled) return;
        paymentOutcomeHandled = true;
        void verify(response, orderId);
      },
      modal: {
        ondismiss: () => {
          if (paymentOutcomeHandled) return;
          paymentOutcomeHandled = true;
          clearCheckoutAttempt();
          setPaymentMessage('Payment cancelled. No payment was collected.');
          void api.post('/payments/razorpay/payment-cancelled', { orderId, providerOrderId })
            .then(() => router.push(`/checkout/failure?order=${encodeURIComponent(orderId)}&reason=cancelled`))
            .catch(() => router.push(`${ROUTES.checkoutPending}?order=${encodeURIComponent(orderId)}`));
        }
      },
      theme: { color: '#b89b5e' }
    });
    razorpay.on('payment.failed', (response) => {
      if (paymentOutcomeHandled) return;
      // Razorpay can keep the same checkout session open after a failed attempt
      // and let the customer retry. Do not make that first failure terminal: a
      // later successful retry must still reach the handler above and settle the
      // local order. Final dismissal is handled by modal.ondismiss.
      setPaymentMessage(response.error?.description ?? 'That payment attempt failed. Please retry or choose another payment method.');
    });
    razorpay.open();
  };
  const onSubmit = (data: CheckoutForm): void => { if (!user) return; setPaymentMessage(''); const address = { fullName: data.fullName, phone: data.phone, line1: data.line1, line2: data.line2, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country }; const paymentMode = data.paymentMethod === 'cod' ? 'cod' : data.paymentMethod === 'partial' ? 'partial' : 'online'; const metaEventId = getOrCreateCheckoutEventId({ items: visibleCartItems, value: orderTotal, coupon }); checkout.mutate({ shippingAddress: address, billingAddress: address, paymentMethod: 'razorpay', paymentMode, shippingMethod: data.shippingMethod, logisticsQuoteId: logisticsQuote.data?.quoteId, metaEventId }, { onSuccess: (result) => { const id = getOrderId(result.order); if (paymentMode === 'cod') { finish(result.order, 'success'); return; } const issue = checkoutPaymentSessionIssue(result, orderTotal, paymentMode); if (issue) { clearCheckoutAttempt(); setPaymentMessage(issue); return; } if (!result.payment?.id) { clearCheckoutAttempt(); setPaymentMessage('A payment session could not be created. Please retry.'); return; } void openRazorpay(id, result.payment.id, result.amountToPay, data).catch((error: unknown) => setPaymentMessage(error instanceof Error ? error.message : 'Secure checkout could not be opened.')); } }); };
  if (!isAuthInitialized) return <main className="min-h-dvh px-6 py-32 lg:px-20" aria-busy="true"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">Private checkout</p><div className="mt-6 h-12 max-w-md animate-shimmer bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" /><p className="mt-6 text-sm text-text-secondary" aria-live="polite">{COPY.auth.checkingSession}</p></section></main>;
  if (!user) { const login = ROUTES.login + '?redirect=' + encodeURIComponent(ROUTES.checkout); return <main className="px-6 py-32 lg:px-20"><section className="mx-auto max-w-2xl border border-border bg-background-elevated p-8 text-center shadow-lg"><p className="font-accent text-xs uppercase tracking-[0.16em] text-accent-gold">{COPY.auth.privateAccess}</p><h1 className="mt-4 font-display text-4xl text-text-primary">{COPY.auth.prompts.checkout.title}</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-text-secondary">{COPY.auth.prompts.checkout.body}</p><div className="mt-8 grid gap-3"><button type="button" onClick={() => openMobileAuth({ next: ROUTES.checkout })} className="inline-flex h-12 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse md:hidden">{COPY.auth.whatsapp.continue}</button><Link href={login} className="hidden h-12 items-center justify-center bg-accent-gold px-5 text-xs uppercase tracking-[0.1em] text-text-inverse md:inline-flex">{COPY.auth.whatsapp.continue}</Link><button type="button" onClick={() => openMobileAuth({ next: ROUTES.checkout, method: 'alternative' })} className="inline-flex h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary md:hidden">{COPY.auth.whatsapp.useAlternatives}</button><Link href={login + '&method=alternative'} className="hidden h-12 items-center justify-center border border-border px-5 text-xs uppercase tracking-[0.1em] text-text-primary md:inline-flex">{COPY.auth.whatsapp.useAlternatives}</Link></div><Link href={ROUTES.shop} className="mt-5 inline-flex text-xs uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary">{COPY.auth.prompts.checkout.dismiss}</Link></section></main>; }
  const changePayment = (value: 'razorpay' | 'cod' | 'partial'): void => {
    if (value === selectedPayment) return;
    setValue('paymentMethod', value);
    trackCheckoutPaymentSelected({ items: visibleCartItems, value: orderTotal, coupon }, value === 'cod' ? 'cod' : value === 'partial' ? 'online_partial' : 'online');
  };
  const submitLabel = selectedPayment === 'cod'
    ? `Place COD order · ${formatPrice(orderTotal)}`
    : selectedPayment === 'partial'
      ? `Pay advance securely · ${formatPrice(orderTotal)}`
      : `Pay ${formatPrice(orderTotal)} securely`;
  const itemCount = visibleCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedDelivery = logisticsQuote.data?.options.find((option) => option.code === selectedShipping);
  const deliveryEstimate = selectedDelivery?.estimatedDeliveryDays
    ? `Delivery in ${selectedDelivery.estimatedDeliveryDays}–${selectedDelivery.estimatedDeliveryDays + 1} days`
    : 'Delivery estimate shown after pincode check';
  const checkoutBusy = checkout.isPending || paymentConfig.isLoading || siteSettings.isLoading || logisticsQuote.isLoading;
  const savings = automaticDiscounts.totalDiscount;
  return <main className="min-h-dvh pb-28 md:px-6 md:py-28 lg:px-20 lg:py-32">
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mx-auto max-w-[1440px]">
      <CheckoutFlowHeader backHref={ROUTES.cart} backLabel="Bag" />
      <motion.div variants={cinematicPanel} className="hidden max-w-4xl md:block">
        <p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">{COPY.checkout.eyebrow}</p>
        <h1 className="mt-4 font-display text-5xl font-light text-text-primary md:text-hero">{COPY.checkout.title}</h1>
        <p className="mt-6 max-w-2xl text-base text-text-secondary">{COPY.checkout.body}</p>
      </motion.div>
      <div className="md:mt-8"><CheckoutPromotionStrip disabled={checkout.isPending} /></div>
      <details className="group border-b border-border-subtle bg-background-elevated/30 md:hidden">
        <summary className="grid min-h-[72px] cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-5 px-5 py-4 marker:hidden">
          <span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-text-primary">Order summary</span><span className="mt-1 block text-xs text-text-secondary">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span></span>
          <span className="flex items-center gap-3"><span className="font-mono text-sm text-accent-gold">{formatPrice(orderTotal)}</span><span className="inline-block text-text-secondary transition group-open:rotate-180">⌄</span></span>
        </summary>
        <OrderSummary variant="mobile" shippingMethod={selectedShipping} shippingSettings={siteSettings.data} shippingAmountOverride={shipping} codFee={codFee} />
      </details>
      <div className="grid gap-8 md:mt-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <motion.div variants={cinematicPanel} className="bg-background-primary/50 shadow-lg backdrop-blur-xl md:space-y-8 md:border md:border-border md:p-8">
          <div className="hidden md:block"><CheckoutProgress step={2} /></div>
          <section className="border-b border-border-subtle px-5 py-7 md:border-0 md:p-0" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">Delivery</h2>
            {addressBook.isLoading ? <div className="h-32 animate-shimmer border border-border-subtle bg-[linear-gradient(90deg,var(--bg-elevated),var(--bg-overlay),var(--bg-elevated))] bg-[length:200%_100%]" aria-label="Loading delivery address" /> : selectedAddress ? <motion.div animate={addressConfirmation ? { borderColor: 'rgba(70, 163, 108, .8)' } : { borderColor: 'var(--border-subtle)' }} className="border bg-background-elevated/40 p-5">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-gold/10 text-accent-gold"><MapPin size={17} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="font-medium text-text-primary">Deliver to {selectedAddress.fullName}</p><button type="button" onClick={() => setAddressSheetOpen(true)} className="min-h-11 shrink-0 px-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-accent-gold">Change</button></div><p className="mt-1 text-sm leading-5 text-text-secondary">{selectedAddress.street}{selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ''}<br />{selectedAddress.city}, {selectedAddress.state} · {selectedAddress.pincode}</p><p className="mt-3 text-xs text-success">{deliveryEstimate}</p></div></div>
              {addressConfirmation ? <p className="mt-4 border-t border-success/20 pt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-success"><Check className="mr-1 inline h-3.5 w-3.5" /> Delivery address added</p> : null}
            </motion.div> : <button type="button" onClick={() => setAddressSheetOpen(true)} className="flex min-h-28 w-full items-center gap-4 border border-border-subtle bg-background-elevated/40 p-5 text-left transition hover:border-accent-gold">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-gold/10 text-accent-gold"><MapPin size={18} /></span><span className="min-w-0 flex-1"><span className="block font-medium text-text-primary">Add delivery address</span><span className="mt-1 block text-sm text-text-secondary">Enter your address to check delivery</span></span><span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.13em] text-accent-gold">Add →</span>
            </button>}
            <p className="mt-3 text-[10px] uppercase tracking-[0.13em] text-text-muted">Billing address same as delivery</p>
          </section>
          <section className="border-b border-border-subtle px-5 py-7 md:border-0 md:p-0"><OffersRewards bundleDiscount={automaticDiscounts.bundleDiscount} /></section>
          <section className="border-b border-border-subtle px-5 py-7 md:border-0 md:p-0" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">Payment</h2>
            <PaymentGateway value={selectedPayment} onChange={changePayment} config={paymentConfig.data} orderTotal={orderTotal} />
          </section>
          {checkout.error || paymentMessage ? <p className="mx-5 text-sm text-danger md:mx-0" aria-live="polite">{paymentMessage || checkout.error?.message}</p> : null}
          <section className="hidden md:block"><Button type="button" onClick={handleSubmit(onSubmit)} className="h-12 w-full text-xs font-semibold tracking-[0.14em]" isLoading={checkout.isPending} disabled={!selectedAddress || checkoutBusy}>{selectedAddress ? submitLabel : 'Add delivery address first'}</Button></section>
        </motion.div>
        <motion.div variants={cinematicPanel} className="hidden lg:block"><OrderSummary shippingMethod={selectedShipping} shippingSettings={siteSettings.data} shippingAmountOverride={shipping} codFee={codFee} /></motion.div>
      </div>
    </motion.div>
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-background-primary/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] items-center gap-3"><div className="min-w-0"><motion.p key={orderTotal} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }} className="truncate font-mono text-lg text-text-primary">{formatPrice(orderTotal)}</motion.p><p className={'mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] ' + (savings > 0 ? 'text-success' : 'text-text-muted')}>{savings > 0 ? `You save ${formatPrice(savings)}` : selectedPayment === 'cod' && codFee > 0 ? `Includes ${formatPrice(codFee)} COD fee` : 'Taxes included'}</p></div>{selectedAddress ? <button type="button" onClick={handleSubmit(onSubmit)} disabled={checkoutBusy} className="h-14 bg-accent-gold px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-text-inverse disabled:cursor-wait disabled:opacity-60">{checkout.isPending ? 'Processing…' : selectedPayment === 'cod' ? 'Place COD order →' : selectedPayment === 'partial' ? 'Pay advance →' : 'Pay securely →'}</button> : <button type="button" onClick={() => setAddressSheetOpen(true)} className="h-14 bg-accent-gold px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-text-inverse">Add delivery address →</button>}</div>
    </div>
    <AddressBottomSheet open={addressSheetOpen} onOpenChange={setAddressSheetOpen} addresses={addresses} selectedAddressId={selectedAddress?._id} customerName={user.name} customerPhone={user.phone} onAddressSelected={(address) => applyAddress(address, true)} />
  </main>;
}
