// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useUpdateOrderStatus } from '@/hooks/useAdminMutations';
import { formatPrice } from '@/lib/utils';
import type { OrderDto } from '@/types/dto.types';

export interface OrderManagerProps {
  orders: OrderDto[];
  isLoading: boolean;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const orderId = (order: OrderDto): string => order.id ?? order._id ?? order.createdAt ?? COPY.common.none;
const statusOptions = Object.entries(COPY.orders.statuses).map(([value, label]) => ({ value, label }));

export function OrderManager({ orders, isLoading }: OrderManagerProps): ReactNode {
  const updateStatus = useUpdateOrderStatus();
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const onUpdate = (order: OrderDto): void => {
    const id = orderId(order);
    if ((statuses[id] ?? order.orderStatus) === 'cancelled' && !window.confirm(COPY.orders.confirmCancel)) return;
    updateStatus.mutate({ id, status: statuses[id] ?? order.orderStatus, note: notes[id] });
  };
  if (!isLoading && orders.length === 0) return <EmptyPanel title={COPY.orders.title} message={COPY.orders.empty} />;
  return <section className="overflow-x-auto border border-border bg-background-elevated shadow-lg"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.table.columns[0]}</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.fields.value}</th><th className="border-b border-border p-4">{COPY.orders.note}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={5}>{COPY.common.loading}</td></tr> : orders.map((order) => { const id = orderId(order); const status = statuses[id] ?? order.orderStatus; return <tr key={id} className="border-b border-border-subtle transition hover:bg-background-overlay/60"><td className="p-4 font-mono text-text-primary"><Link className="hover:text-accent-gold" href={'/orders/' + id}>{id}</Link><p className="mt-2"><StatusPill tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus}</StatusPill></p></td><td className="p-4"><SelectField label={COPY.fields.status} options={statusOptions} value={status} onChange={(event) => setStatuses((current) => ({ ...current, [id]: event.target.value as OrderStatus }))} /></td><td className="p-4 font-mono text-accent-gold">{formatPrice(order.total)}</td><td className="p-4"><Input label={COPY.orders.note} value={notes[id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))} /></td><td className="p-4"><Button onClick={() => onUpdate(order)} disabled={updateStatus.isPending}>{COPY.orders.update}</Button></td></tr>; })}</tbody></table></section>;
}
