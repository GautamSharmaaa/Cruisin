'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useOrderPaymentAction, useUpdateOrderStatus } from '@/hooks/useAdminMutations';
import { useAdminOrder } from '@/hooks/useAdminResources';
import { formatPrice } from '@/lib/utils';

export interface OrderDetailClientProps { id: string; }
type OrderStatus = 'pending' | 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
const statusOptions = (['pending', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] as OrderStatus[]).map((value) => ({ value, label: value === 'placed' ? 'Placed' : value === 'returned' ? 'Returned' : COPY.orders.statuses[value as keyof typeof COPY.orders.statuses] ?? value }));
const line = (parts: Array<string | undefined>): string => parts.filter(Boolean).join(', ');

export function OrderDetailClient({ id }: OrderDetailClientProps): ReactNode {
  const order = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const paymentAction = useOrderPaymentAction();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  if (order.isLoading) return <p className="text-sm text-text-secondary">{COPY.common.loading}</p>;
  if (!order.data) return <p className="text-sm text-danger">{COPY.common.error}</p>;
  const current = order.data;
  const displayId = current.id ?? current._id ?? id;
  const selectedStatus = (status || current.orderStatus) as OrderStatus;
  const onUpdate = (): void => { if (selectedStatus === 'cancelled' && !window.confirm(COPY.orders.confirmCancel)) return; updateStatus.mutate({ id: displayId, status: selectedStatus, note, trackingNumber }); };
  const canRefund = current.paymentProvider === 'razorpay' && Boolean(current.razorpayPaymentId) && (current.amountPaid ?? 0) > (current.refundAmount ?? 0);
  return <section className="grid gap-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{current.orderNumber ?? displayId}</p><h1 className="mt-2 font-display text-3xl">{COPY.orders.detail}</h1></div><div className="grid gap-3 md:grid-cols-[180px_220px_auto]"><SelectField label={COPY.fields.status} options={statusOptions} value={selectedStatus} onChange={(event) => setStatus(event.target.value as OrderStatus)} /><Input label={COPY.orders.tracking} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /><Button onClick={onUpdate} disabled={updateStatus.isPending}>{updateStatus.isPending ? COPY.common.loading : COPY.orders.update}</Button></div></div>
    <Input label={COPY.orders.note} value={note} onChange={(event) => setNote(event.target.value)} />
    <div className="grid gap-6 lg:grid-cols-3"><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">Payment</h2><p className="mt-4 text-sm text-text-secondary">{current.paymentMode ?? 'online'} · {current.paymentStatus}</p><p className="mt-2 font-mono text-accent-gold">Paid {formatPrice(current.amountPaid ?? 0)} · Due {formatPrice(current.amountDue ?? current.total)}</p><p className="mt-2 break-all text-xs text-text-muted">Razorpay order: {current.razorpayOrderId ?? '—'}<br />Payment: {current.razorpayPaymentId ?? '—'}</p></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.shipping}</h2><p className="mt-4 text-sm text-text-secondary">{current.shippingAddress?.fullName ?? COPY.common.none}</p><p className="mt-2 text-sm text-text-secondary">{line([current.shippingAddress?.line1, current.shippingAddress?.line2, current.shippingAddress?.city, current.shippingAddress?.state, current.shippingAddress?.postalCode, current.shippingAddress?.country])}</p></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">Payment operations</h2><div className="mt-4 grid gap-2">{current.paymentMode === 'cod' && current.paymentStatus !== 'paid' ? <Button onClick={() => paymentAction.mutate({ id: displayId, action: 'mark-cod-paid' })} disabled={paymentAction.isPending}>Mark COD paid</Button> : null}{current.paymentMode === 'partial' && current.amountDue ? <Button onClick={() => paymentAction.mutate({ id: displayId, action: 'mark-partial-paid' })} disabled={paymentAction.isPending}>Mark remaining collected</Button> : null}{canRefund ? <><Input label="Refund amount" type="number" min="1" max={String((current.amountPaid ?? 0) - (current.refundAmount ?? 0))} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /><Input label="Refund reason" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} /><Button variant="secondary" onClick={() => paymentAction.mutate({ id: displayId, action: 'refund', amount: Number(refundAmount), reason: refundReason })} disabled={!Number(refundAmount) || paymentAction.isPending}>Refund paid amount</Button></> : null}</div></article></div>
    <div className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">Item</th><th className="border-b border-border p-4">SKU</th><th className="border-b border-border p-4">Quantity</th><th className="border-b border-border p-4">Price</th></tr></thead><tbody>{(current.items ?? []).map((item) => <tr key={item.sku + item.title} className="border-b border-border-subtle"><td className="p-4 text-text-primary">{item.title}</td><td className="p-4 font-mono text-text-secondary">{item.sku}</td><td className="p-4 text-text-secondary">{item.quantity}</td><td className="p-4 font-mono text-accent-gold">{formatPrice(item.price)}</td></tr>)}</tbody></table></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.timeline}</h2><div className="mt-4 grid gap-3">{(current.timeline ?? []).map((event) => <div key={event.status + event.timestamp} className="border-l border-accent-gold pl-4"><p className="text-sm uppercase tracking-[0.12em] text-text-primary">{event.status}</p><p className="mt-1 text-xs text-text-secondary">{event.timestamp}</p><p className="mt-1 text-sm text-text-secondary">{event.note ?? COPY.common.none}</p></div>)}</div></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.totals}</h2><div className="mt-4 grid gap-2 text-sm text-text-secondary"><p className="flex justify-between"><span>{COPY.orders.subtotal}</span><span>{formatPrice(current.subtotal ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.tax}</span><span>{formatPrice(current.tax ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.shipping}</span><span>{formatPrice(current.shipping ?? 0)}</span></p><p className="flex justify-between"><span>COD fee</span><span>{formatPrice(current.codFee ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.discount}</span><span>{formatPrice(current.discount ?? 0)}</span></p><p className="flex justify-between border-t border-border pt-3 font-mono text-lg text-accent-gold"><span>{COPY.fields.value}</span><span>{formatPrice(current.total)}</span></p></div></article></div>
    {paymentAction.error ? <p className="text-sm text-danger">{paymentAction.error.message}</p> : null}
  </section>;
}
