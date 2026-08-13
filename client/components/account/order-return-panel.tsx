'use client';

// Governed by .rules v1.0
import { Camera, CheckCircle2, LoaderCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateExchange, useCreateReturn, useExchangeOptions, useMyReturns, useUploadReturnEvidence, useVerifyExchangePayment, useVerifyReturnPayment, type ReturnEvidenceUpload } from '@/hooks/useReturns';
import { loadRazorpay, type RazorpaySuccess } from '@/lib/razorpay';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Order } from '@/types/order.types';

const reasons = [['wrong_size_fit', 'Wrong size / fit'], ['damaged_product', 'Damaged product'], ['defective_product', 'Defective product'], ['wrong_item_received', 'Wrong item received'], ['different_from_expectation', 'Product different from expectation'], ['quality_issue', 'Quality issue'], ['missing_item_part', 'Missing item / part'], ['other', 'Other']] as const;
const reasonLabel = (value: string): string => reasons.find(([key]) => key === value)?.[1] ?? value.replaceAll('_', ' ');

export function OrderReturnPanel({ order }: { order: Order }): ReactNode {
  const localOrderId = order.id ?? order._id ?? '';
  const eligible = order.orderStatus === 'delivered' || order.status === 'delivered';
  const user = useAuthStore((state) => state.user);
  const mine = useMyReturns();
  const createReturn = useCreateReturn();
  const verify = useVerifyReturnPayment();
  const uploadEvidence = useUploadReturnEvidence();
  const photoInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<'return' | 'exchange' | null>(null);
  const [review, setReview] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<ReturnEvidenceUpload[]>([]);
  const [message, setMessage] = useState('');
  const [submittedNumber, setSubmittedNumber] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector<HTMLButtonElement>('[aria-label="Close return dialog"]')?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = previousOverflow; opener?.focus(); };
  }, [open]);
  const selected = useMemo(() => order.items.flatMap((item) => { const variantId = item.variantId ?? item.variant; const quantity = variantId ? quantities[variantId] ?? 0 : 0; return variantId && quantity > 0 ? [{ item, variantId, quantity }] : []; }), [order.items, quantities]);
  const orderReturns = (mine.data ?? []).filter((request) => String(request.order) === localOrderId);

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setMessage('');
    if (photos.length + files.length > 5) { setMessage('You can upload up to 5 photos.'); return; }
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage('Use JPEG, PNG or WebP photos only.'); return; }
      if (file.size > 8 * 1024 * 1024) { setMessage('Each photo must be 8 MB or smaller.'); return; }
    }
    try {
      const uploaded = await Promise.all(files.map((file) => uploadEvidence.mutateAsync(file)));
      setPhotos((current) => [...current, ...uploaded]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A photo could not be uploaded.');
    }
  };

  const startPayment = async (): Promise<void> => {
    setMessage('');
    const storageKey = `cruisin:return-attempt:${localOrderId}`;
    let idempotencyKey = window.localStorage.getItem(storageKey);
    if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); window.localStorage.setItem(storageKey, idempotencyKey); }
    try {
      const session = await createReturn.mutateAsync({ orderId: localOrderId, items: selected.map(({ variantId, quantity }) => ({ variantId, quantity })), reason, details: details.trim() || undefined, evidence: photos.map(({ publicId, version, format, token }) => ({ publicId, version, format, token })), idempotencyKey });
      if (session.request.handlingFeePaymentStatus === 'paid') { setSubmittedNumber(session.request.requestNumber); window.localStorage.removeItem(storageKey); return; }
      if (!session.payment) throw new Error('A secure payment session could not be created.');
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error('Online payments are not configured for this storefront.');
      await loadRazorpay();
      const razorpay = new window.Razorpay!({ key, amount: Math.round(session.payment.amount * 100), currency: 'INR', name: 'CRUISIN', description: `Return handling fee · ${session.request.requestNumber}`, order_id: session.payment.id, prefill: { name: user?.name, email: user?.email, contact: user?.phone }, handler: (response: RazorpaySuccess) => { void verify.mutateAsync({ requestId: session.request.id, payload: { ...response } }).then(() => { window.localStorage.removeItem(storageKey); setSubmittedNumber(session.request.requestNumber); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment verification is pending.')); }, modal: { ondismiss: () => setMessage('Payment was not completed. Your return has not been submitted; you can retry safely.') }, theme: { color: '#b89b5e' } });
      razorpay.on('payment.failed', (response) => setMessage(response.error?.description ?? 'Payment failed. You can retry without creating another request.'));
      razorpay.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Return payment could not be started.'); }
  };

  return <section className="border border-border bg-background-elevated p-5 sm:p-6" aria-labelledby="returns-heading">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-accent-gold" aria-hidden="true" /><h2 id="returns-heading" className="font-display text-2xl">Returns & exchanges</h2></div><p className="mt-2 text-sm text-text-secondary">Choose an issue and upload photos for eligible items within 5 days of delivery.</p></div><Button type="button" variant="secondary" disabled={!eligible} onClick={() => { setFlow(null); setOpen(true); }}>{eligible ? 'Return or exchange' : 'Available after delivery'}</Button></div>
    {orderReturns.length ? <div className="mt-5 grid gap-3">{orderReturns.map((request) => <article key={request._id} className="border border-border-subtle bg-background-primary p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-mono text-xs text-accent-gold">{request.requestNumber}</p><p className="text-xs uppercase tracking-[0.1em] text-text-secondary">{request.status.replaceAll('_', ' ')}</p></div><p className="mt-2 text-sm text-text-primary">{request.items?.map((item) => `${item.quantity} × ${item.title}`).join(', ') || 'Return items'}</p><p className="mt-2 text-xs text-text-muted">Handling fee {formatPrice(request.handlingFee)} · {request.handlingFeePaymentStatus}</p><p className="mt-1 text-xs text-text-muted">Product refund {request.productRefundAmount ? formatPrice(request.productRefundAmount) : 'pending calculation'} · {request.refundStatus.replaceAll('_', ' ')}</p></article>)}</div> : null}
    {open ? <div role="dialog" aria-modal="true" aria-labelledby="return-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-border bg-background-primary p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.15em] text-accent-gold">{review ? 'Return review' : 'Return items'}</p><h2 id="return-dialog-title" className="mt-2 font-display text-3xl">{submittedNumber ? 'Return request submitted' : review ? `Order ${order.orderNumber ?? localOrderId}` : 'Select items to return'}</h2></div><button type="button" aria-label="Close return dialog" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center border border-border"><X /></button></div>
      {flow === null ? <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setFlow('return')} className="min-h-36 border border-border p-5 text-left transition hover:border-accent-gold"><p className="font-display text-xl">Return an item</p><p className="mt-2 text-sm text-text-secondary">Select items, describe the issue, add photos, then pay the ₹100 handling fee.</p></button><button type="button" onClick={() => setFlow('exchange')} className="min-h-36 border border-border p-5 text-left transition hover:border-accent-gold"><p className="font-display text-xl">Exchange size or colour</p><p className="mt-2 text-sm text-text-secondary">Choose another in-stock size or colour of the exact same product.</p></button></div> : flow === 'exchange' ? <ExchangeFlow orderId={localOrderId} /> : submittedNumber ? <div className="mt-7 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="mt-4 font-mono text-accent-gold">{submittedNumber}</p><p className="mt-3 text-sm text-text-primary">Handling fee ₹100 — Paid</p><p className="mt-2 text-sm leading-6 text-text-secondary">Your request is submitted for review. After pickup, warehouse receipt and a successful quality check, you can confirm your eligible product refund destination—original payment when available, Cruisin Wallet, or UPI.</p></div> : review ? <div className="mt-7"><div className="grid gap-3">{selected.map(({ item, quantity, variantId }) => <p key={variantId} className="flex justify-between gap-4 border-b border-border pb-3 text-sm"><span>{quantity} × {item.title}<span className="block text-xs text-text-muted">{[item.size, item.color].filter(Boolean).join(' / ')}</span></span><span>{formatPrice(item.price * quantity)}</span></p>)}</div><dl className="mt-5 grid gap-3 text-sm"><div><dt className="text-text-muted">Issue</dt><dd>{reasonLabel(reason)}</dd></div>{details ? <div><dt className="text-text-muted">Additional details</dt><dd className="mt-1 leading-6">{details}</dd></div> : null}<div><dt className="text-text-muted">Photos</dt><dd className="mt-2 flex flex-wrap gap-2">{photos.map((photo, index) => <img key={photo.publicId} src={photo.url} alt={`Issue photo ${index + 1}`} className="h-20 w-20 border border-border object-cover" />)}</dd></div><div className="flex justify-between border-t border-border pt-4"><dt>Return handling fee</dt><dd className="font-mono">₹100</dd></div><div className="flex justify-between text-base font-medium"><dt>Payable now</dt><dd className="font-mono text-accent-gold">₹100</dd></div></dl><p className="mt-4 text-xs leading-5 text-text-muted">The ₹100 handling fee applies once to this request. It is separate from the eligible product refund, which starts only after the returned items pass warehouse quality checks.</p><div className="mt-6 grid gap-3 sm:flex"><Button type="button" variant="secondary" onClick={() => setReview(false)}>Edit</Button><Button type="button" onClick={() => void startPayment()} disabled={createReturn.isPending || verify.isPending}>{createReturn.isPending || verify.isPending ? 'Please wait…' : 'Pay ₹100 & Submit Return'}</Button></div></div> : <div className="mt-7"><div className="grid gap-3">{order.items.map((item) => { const variantId = item.variantId ?? item.variant ?? ''; const quantity = quantities[variantId] ?? 0; return <label key={`${item.sku}-${variantId}`} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 border border-border p-3 sm:grid-cols-[minmax(0,1fr)_100px] sm:gap-4 sm:p-4"><span className="min-w-0 text-sm text-text-primary">{item.title}<span className="mt-1 block truncate text-xs text-text-muted">{[item.size, item.color].filter(Boolean).join(' / ') || item.sku}</span></span><select aria-label={`Return quantity for ${item.title}`} value={quantity} onChange={(event) => setQuantities((current) => ({ ...current, [variantId]: Number(event.target.value) }))} className="h-11 w-full border border-border bg-background-input px-3"><option value={0}>None</option>{Array.from({ length: item.quantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>; })}</div><label className="mt-5 block text-sm text-text-secondary">What is the issue? <span className="text-danger">*</span><select required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 h-12 w-full border border-border bg-background-input px-3 text-text-primary"><option value="">Choose an issue</option>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-5 block text-sm text-text-secondary">Tell us more <span className="text-text-muted">(optional)</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Add any details that may help our team." className="mt-2 w-full border border-border bg-background-input p-3 text-text-primary" /></label><fieldset className="mt-5"><legend className="text-sm text-text-secondary">Issue photos <span className="text-danger">*</span></legend><p className="mt-1 text-xs leading-5 text-text-muted">Upload 1–5 clear photos. On mobile, you can take a photo directly.</p><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" onChange={(event) => void addPhotos(event)} /><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{photos.map((photo, index) => <div key={photo.publicId} className="relative aspect-square"><img src={photo.url} alt={`Issue photo ${index + 1}`} className="h-full w-full border border-border object-cover" /><button type="button" aria-label={`Remove issue photo ${index + 1}`} onClick={() => setPhotos((current) => current.filter((item) => item.publicId !== photo.publicId))} className="absolute right-1 top-1 grid h-9 w-9 place-items-center bg-black/80 text-white"><Trash2 className="h-4 w-4" /></button></div>)}{photos.length < 5 ? <button type="button" onClick={() => photoInput.current?.click()} disabled={uploadEvidence.isPending} className="grid aspect-square min-h-24 place-items-center border border-dashed border-accent-gold/60 bg-background-elevated p-2 text-center text-xs text-text-secondary"><span>{uploadEvidence.isPending ? <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" /> : <Camera className="mx-auto mb-2 h-5 w-5 text-accent-gold" />}{uploadEvidence.isPending ? 'Uploading…' : photos.length ? 'Add photo' : 'Take or upload'}</span></button> : null}</div></fieldset><p className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-sm"><span>Return handling fee</span><span className="font-mono text-accent-gold">₹100 per request</span></p><Button type="button" className="mt-6 w-full sm:w-auto" disabled={!selected.length || !reason || !photos.length || uploadEvidence.isPending} onClick={() => setReview(true)}>Review & continue</Button></div>}
      {message ? <p role="alert" className="mt-5 text-sm text-danger">{message}</p> : null}</div></div> : null}
  </section>;
}

function ExchangeFlow({ orderId }: { orderId: string }): ReactNode {
  const options = useExchangeOptions(orderId, true);
  const createExchange = useCreateExchange();
  const verifyExchange = useVerifyExchangePayment();
  const user = useAuthStore((state) => state.user);
  const [originalVariantId, setOriginalVariantId] = useState('');
  const [requestedVariantId, setRequestedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState('');
  const [message, setMessage] = useState('');
  const original = options.data?.find((item) => item.variantId === originalVariantId) ?? options.data?.[0];
  const alternatives = (original?.alternatives ?? []).filter((variant) => variant.id !== original?.variantId);
  const requested = alternatives.find((variant) => variant.id === requestedVariantId);
  useEffect(() => {
    if (original && originalVariantId !== original.variantId) setOriginalVariantId(original.variantId);
  }, [original, originalVariantId]);
  useEffect(() => {
    if (!requested || !requested.enabled || requested.stock < quantity) setRequestedVariantId(alternatives.find((variant) => variant.enabled && variant.stock >= quantity)?.id ?? '');
  }, [alternatives, quantity, requested]);
  if (options.isLoading) return <p className="mt-7 text-sm text-text-secondary">Loading available sizes and colours…</p>;
  if (options.isError || !original) return <p role="alert" className="mt-7 text-sm text-danger">Exchange choices could not be loaded. Please try again.</p>;
  if (submitted) return <div className="mt-7 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="mt-4 font-mono text-accent-gold">{submitted}</p><p className="mt-3 text-sm text-text-primary">Exchange request submitted</p><p className="mt-2 text-sm leading-6 text-text-secondary">We will review the request, arrange the reverse pickup, and ship the selected replacement after quality checks.</p></div>;
  const submit = async (): Promise<void> => {
    if (!original || !requestedVariantId) return;
    setMessage('');
    try {
      const session = await createExchange.mutateAsync({ orderId, variantId: original.variantId, requestedVariantId, quantity, idempotencyKey: crypto.randomUUID() });
      if (session.request.handlingFeePaymentStatus === 'paid') { setSubmitted(session.request.requestNumber); return; }
      if (!session.payment) throw new Error('A secure exchange payment session could not be created.');
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error('Online payments are not configured for this storefront.');
      await loadRazorpay();
      const razorpay = new window.Razorpay!({ key, amount: Math.round(session.payment.amount * 100), currency: 'INR', name: 'CRUISIN', description: `Exchange handling fee · ${session.request.requestNumber}`, order_id: session.payment.id, prefill: { name: user?.name, email: user?.email, contact: user?.phone }, handler: (response: RazorpaySuccess) => { void verifyExchange.mutateAsync({ requestId: session.request.id, payload: { ...response } }).then((request) => setSubmitted(request.requestNumber)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment verification is pending.')); }, modal: { ondismiss: () => setMessage('Payment was not completed. Your exchange has not been submitted; you can retry safely.') }, theme: { color: '#b89b5e' } });
      razorpay.on('payment.failed', (response) => setMessage(response.error?.description ?? 'Payment failed. You can retry safely.'));
      razorpay.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exchange could not be submitted.'); }
  };
  return <div className="mt-7 grid gap-5"><div className="border border-accent-gold/50 bg-accent-gold/5 p-4 text-sm leading-6 text-text-secondary">You can exchange only for a different, in-stock size or colour of the same product. The final availability is reserved when your request is approved.</div><label className="grid gap-2 text-sm text-text-secondary">Item to exchange<select aria-label="Item to exchange" value={original.variantId} onChange={(event) => { setOriginalVariantId(event.target.value); setQuantity(1); setRequestedVariantId(''); }} className="h-12 border border-border bg-background-input px-3 text-text-primary">{options.data?.map((item) => <option key={item.variantId} value={item.variantId}>{item.title} · {[item.size, item.color].filter(Boolean).join(' / ') || item.sku}</option>)}</select></label><div className="border border-border p-4"><p className="text-sm text-text-primary">Your item</p><p className="mt-1 text-xs text-text-muted">{original.title} · {[original.size, original.color].filter(Boolean).join(' / ') || original.sku}</p></div><label className="grid gap-2 text-sm text-text-secondary">Replacement size / colour<select aria-label="Replacement size or colour" value={requestedVariantId} onChange={(event) => setRequestedVariantId(event.target.value)} className="h-12 border border-border bg-background-input px-3 text-text-primary"><option value="">Choose a replacement</option>{alternatives.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.enabled || variant.stock < quantity}>{variant.size} / {variant.color}{!variant.enabled || variant.stock < quantity ? ' — unavailable' : ''}</option>)}</select></label>{requested ? <p className="text-xs text-success">Selected: {requested.size} / {requested.color} · {requested.stock} in stock</p> : null}<label className="grid gap-2 text-sm text-text-secondary">Quantity<select aria-label="Exchange quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-12 border border-border bg-background-input px-3 text-text-primary">{Array.from({ length: original.quantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><div className="flex justify-between border-t border-border pt-4 text-sm"><span>Exchange handling fee</span><span className="font-mono text-accent-gold">₹100</span></div><Button type="button" className="w-full sm:w-auto" disabled={!requestedVariantId || createExchange.isPending || verifyExchange.isPending} onClick={() => void submit()}>{createExchange.isPending || verifyExchange.isPending ? 'Please wait…' : 'Pay ₹100 & request exchange'}</Button>{message ? <p role="alert" className="text-sm text-danger">{message}</p> : null}</div>;
}
