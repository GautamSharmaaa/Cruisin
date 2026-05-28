// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useUpdateOrderStatus } from '@/hooks/useAdminMutations';
import { useAdminOrder } from '@/hooks/useAdminResources';
import { formatPrice } from '@/lib/utils';

export interface OrderDetailClientProps {
  id: string;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusOptions = Object.entries(COPY.orders.statuses).map(([value, label]) => ({ value, label }));
const line = (parts: Array<string | undefined>): string => parts.filter(Boolean).join(', ');

export function OrderDetailClient({ id }: OrderDetailClientProps): ReactNode {
  const order = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [status, setStatus] = useState<OrderStatus>('processing');
  const [note, setNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  if (order.isLoading) return <p className="text-sm text-text-secondary">{COPY.common.loading}</p>;
  if (!order.data) return <p className="text-sm text-danger">{COPY.common.error}</p>;
  const current = order.data;
  const displayId = current.id ?? current._id ?? id;
  const shippingAddress = current.shippingAddress;
  const billingAddress = current.billingAddress;
  const onUpdate = (): void => {
    if (status === 'cancelled' && !window.confirm(COPY.orders.confirmCancel)) return;
    updateStatus.mutate({ id: displayId, status, note, trackingNumber });
  };
  return <section className="grid gap-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">{displayId}</p><h1 className="mt-2 font-display text-3xl">{COPY.orders.detail}</h1></div><div className="grid gap-3 md:grid-cols-[180px_220px_auto]"><SelectField label={COPY.fields.status} options={statusOptions} value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)} /><Input label={COPY.orders.tracking} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /><Button onClick={onUpdate} disabled={updateStatus.isPending}>{updateStatus.isPending ? COPY.common.loading : COPY.orders.update}</Button></div></div><Input label={COPY.orders.note} value={note} onChange={(event) => setNote(event.target.value)} /><div className="grid gap-6 lg:grid-cols-3"><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.customer}</h2><p className="mt-4 text-sm text-text-secondary">{current.user ?? current.sessionId ?? COPY.common.none}</p><p className="mt-2 text-sm text-text-secondary">{current.paymentMethod ?? COPY.common.none} / {current.paymentStatus}</p></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.shipping}</h2><p className="mt-4 text-sm text-text-secondary">{shippingAddress?.fullName ?? COPY.common.none}</p><p className="mt-2 text-sm text-text-secondary">{line([shippingAddress?.line1, shippingAddress?.line2, shippingAddress?.city, shippingAddress?.state, shippingAddress?.postalCode, shippingAddress?.country])}</p></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.billing}</h2><p className="mt-4 text-sm text-text-secondary">{billingAddress?.fullName ?? COPY.common.none}</p><p className="mt-2 text-sm text-text-secondary">{line([billingAddress?.line1, billingAddress?.line2, billingAddress?.city, billingAddress?.state, billingAddress?.postalCode, billingAddress?.country])}</p></article></div><div className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.title}</th><th className="border-b border-border p-4">{COPY.fields.sku}</th><th className="border-b border-border p-4">{COPY.fields.quantity}</th><th className="border-b border-border p-4">{COPY.table.price}</th></tr></thead><tbody>{(current.items ?? []).map((item) => <tr key={item.sku + item.title} className="border-b border-border-subtle"><td className="p-4 text-text-primary">{item.title}</td><td className="p-4 font-mono text-text-secondary">{item.sku}</td><td className="p-4 text-text-secondary">{item.quantity}</td><td className="p-4 font-mono text-accent-gold">{formatPrice(item.price)}</td></tr>)}</tbody></table></div><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.timeline}</h2><div className="mt-4 grid gap-3">{(current.timeline ?? []).map((event) => <div key={event.status + event.timestamp} className="border-l border-accent-gold pl-4"><p className="text-sm uppercase tracking-[0.12em] text-text-primary">{event.status}</p><p className="mt-1 text-xs text-text-secondary">{event.timestamp}</p><p className="mt-1 text-sm text-text-secondary">{event.note ?? COPY.common.none}</p></div>)}</div></article><article className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.orders.totals}</h2><div className="mt-4 grid gap-2 text-sm text-text-secondary"><p className="flex justify-between"><span>{COPY.orders.subtotal}</span><span>{formatPrice(current.subtotal ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.tax}</span><span>{formatPrice(current.tax ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.shipping}</span><span>{formatPrice(current.shipping ?? 0)}</span></p><p className="flex justify-between"><span>{COPY.orders.discount}</span><span>{formatPrice(current.discount ?? 0)}</span></p><p className="flex justify-between border-t border-border pt-3 font-mono text-lg text-accent-gold"><span>{COPY.fields.value}</span><span>{formatPrice(current.total)}</span></p></div></article></div>{updateStatus.isSuccess ? <p className="text-sm text-success">{COPY.common.success}</p> : null}</section>;
}
