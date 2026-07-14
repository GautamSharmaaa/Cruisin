// Governed by .rules v1.0
'use client';

import { Eye, PackageCheck, Search, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { AdminCard, AdminDataTable, AdminFilters, AdminStat, AdminStatsGrid, EmptyState } from '@/components/dashboard/admin-ui';
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

type OrderStatus = 'pending' | 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

const orderId = (order: OrderDto): string => order.id ?? order._id ?? order.createdAt ?? COPY.common.none;
const orderLabel = (order: OrderDto): string => order.orderNumber ?? orderId(order);
const orderStatusValues: OrderStatus[] = ['pending', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const statusOptions = orderStatusValues.map((value) => ({ value, label: value === 'placed' ? 'Placed' : value === 'returned' ? 'Returned' : COPY.orders.statuses[value as keyof typeof COPY.orders.statuses] ?? value }));
const statuses = ['all', ...orderStatusValues] as const;
const paymentStatuses = ['all', 'pending', 'authorized', 'paid', 'failed', 'partially_paid', 'cod_pending', 'refunded', 'partially_refunded'] as const;
const paymentModes = ['all', 'online', 'cod', 'partial'] as const;

export function OrderManager({ orders, isLoading }: OrderManagerProps): ReactNode {
  const updateStatus = useUpdateOrderStatus();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('all');
  const [paymentFilter, setPaymentFilter] = useState<(typeof paymentStatuses)[number]>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<(typeof paymentModes)[number]>('all');
  const [statusesById, setStatusesById] = useState<Record<string, OrderStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);

  const stats = useMemo(() => ({
    total: orders.length,
    paid: orders.filter((order) => order.paymentStatus === 'paid').length,
    pending: orders.filter((order) => ['pending', 'placed'].includes(order.orderStatus)).length,
    shipped: orders.filter((order) => ['shipped', 'delivered'].includes(order.orderStatus)).length,
    cancelled: orders.filter((order) => order.orderStatus === 'cancelled').length,
    revenue: orders.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.total, 0)
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const haystack = [orderId(order), order.orderNumber, order.shippingAddress?.fullName, order.shippingAddress?.phone, order.shippingAddress?.city, order.items?.map((item) => item.title + ' ' + item.sku + ' ' + (item.color ?? '') + ' ' + (item.size ?? '')).join(' '), order.couponCode, order.trackingNumber].join(' ').toLowerCase();
      return (!needle || haystack.includes(needle)) && (statusFilter === 'all' || order.orderStatus === statusFilter) && (paymentFilter === 'all' || order.paymentStatus === paymentFilter) && (paymentModeFilter === 'all' || order.paymentMode === paymentModeFilter);
    });
  }, [orders, paymentFilter, paymentModeFilter, query, statusFilter]);

  const onUpdate = (order: OrderDto): void => {
    const id = orderId(order);
    const status = statusesById[id] ?? order.orderStatus;
    if (status === 'cancelled' && !window.confirm(COPY.orders.confirmCancel)) return;
    updateStatus.mutate({ id, status, note: notes[id], trackingNumber: tracking[id] ?? order.trackingNumber });
  };

  if (!isLoading && orders.length === 0) return <EmptyState title={COPY.orders.title} message={COPY.orders.empty} />;

  return <section className="grid min-w-0 gap-6">
    <AdminStatsGrid className="xl:grid-cols-6">
      <AdminStat label="Orders" value={stats.total} />
      <AdminStat label="Paid" value={stats.paid} tone="success" />
      <AdminStat label="Pending/Placed" value={stats.pending} tone="warning" />
      <AdminStat label="Shipped/Delivered" value={stats.shipped} />
      <AdminStat label="Cancelled" value={stats.cancelled} tone="danger" />
      <AdminStat label="Paid revenue" value={formatPrice(stats.revenue)} tone="gold" />
    </AdminStatsGrid>

    <AdminFilters action={<Button variant="secondary" onClick={() => { setQuery(''); setStatusFilter('all'); setPaymentFilter('all'); setPaymentModeFilter('all'); }}>Reset Filters</Button>}>
      <label className="grid min-w-[260px] flex-1 gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>Search order, customer, product, coupon</span><span className="flex h-11 items-center border border-border bg-background-input px-3"><Search size={16} className="mr-2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm normal-case text-text-primary outline-none" /></span></label>
      <SelectField label="Order status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])} options={statuses.map((value) => ({ value, label: value === 'all' ? 'All statuses' : value === 'placed' ? 'Placed' : value === 'returned' ? 'Returned' : COPY.orders.statuses[value] }))} />
      <SelectField label="Payment status" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as (typeof paymentStatuses)[number])} options={paymentStatuses.map((value) => ({ value, label: value === 'all' ? 'All payments' : value }))} />
      <SelectField label="Payment mode" value={paymentModeFilter} onChange={(event) => setPaymentModeFilter(event.target.value as (typeof paymentModes)[number])} options={paymentModes.map((value) => ({ value, label: value === 'all' ? 'All methods' : value }))} />
    </AdminFilters>

    <AdminDataTable minWidth={1180}>
      <thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">Order</th><th className="border-b border-border p-4">Customer</th><th className="border-b border-border p-4">Items</th><th className="border-b border-border p-4">Payment</th><th className="border-b border-border p-4">Fulfilment</th><th className="border-b border-border p-4">Value</th><th className="border-b border-border p-4">Update</th><th className="border-b border-border p-4">Actions</th></tr></thead>
      <tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={8}>{COPY.common.loading}</td></tr> : filteredOrders.map((order) => {
        const id = orderId(order);
        const status = statusesById[id] ?? order.orderStatus;
        const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
        return <tr key={id} className="border-b border-border-subtle align-top transition hover:bg-background-overlay/60">
          <td className="p-4"><Link className="break-all font-mono text-text-primary hover:text-accent-gold" href={'/orders/' + id}>{orderLabel(order)}</Link><p className="mt-2 text-xs text-text-muted">{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'No date'}</p></td>
          <td className="p-4 text-text-secondary"><p className="text-text-primary">{order.shippingAddress?.fullName ?? 'Guest'}</p><p className="mt-1 text-xs">{order.shippingAddress?.phone ?? 'No phone'}</p><p className="mt-1 text-xs">{[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}</p></td>
          <td className="p-4 text-text-secondary"><p className="text-text-primary">{itemCount} items</p><p className="mt-1 max-w-72 truncate text-xs">{order.items?.map((item) => item.title + ' x' + item.quantity).join(', ') || 'No items'}</p>{order.couponCode ? <p className="mt-1 font-mono text-xs text-accent-gold">{order.couponCode}</p> : null}</td>
          <td className="p-4"><StatusPill tone={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>{order.paymentStatus}</StatusPill><p className="mt-2 text-xs text-text-muted">{order.paymentMode ?? order.paymentMethod ?? 'payment'} · paid {formatPrice(order.amountPaid ?? 0)} · due {formatPrice(order.amountDue ?? order.total)}</p><p className="mt-1 max-w-48 truncate font-mono text-[10px] text-text-muted">{order.razorpayPaymentId ?? ''}</p></td>
          <td className="p-4"><StatusPill tone={order.orderStatus === 'cancelled' ? 'danger' : order.orderStatus === 'delivered' ? 'success' : 'warning'}>{order.orderStatus}</StatusPill><p className="mt-2 text-xs text-text-muted">{order.trackingNumber ?? 'No tracking'}</p></td>
          <td className="p-4 font-mono text-accent-gold">{formatPrice(order.total)}<p className="mt-1 text-xs text-text-muted">Discount {formatPrice(order.discount ?? 0)}</p></td>
          <td className="p-4"><div className="grid min-w-56 gap-2"><SelectField label={'Status for order ' + id} options={statusOptions} value={status} onChange={(event) => setStatusesById((current) => ({ ...current, [id]: event.target.value as OrderStatus }))} /><Input label={'Tracking for order ' + id} value={tracking[id] ?? order.trackingNumber ?? ''} onChange={(event) => setTracking((current) => ({ ...current, [id]: event.target.value }))} /><Input label={'Admin note for order ' + id} value={notes[id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))} /></div></td>
          <td className="p-4"><div className="grid gap-2"><Button aria-label={'Update order ' + id} onClick={() => onUpdate(order)} disabled={updateStatus.isPending}><PackageCheck size={15} className="mr-2" />Update</Button><Button aria-label={'Details for order ' + id} variant="secondary" onClick={() => setSelectedOrder(order)}><Eye size={15} className="mr-2" />Details</Button></div></td>
        </tr>;
      })}</tbody>
    </AdminDataTable>

    {selectedOrder ? <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} /> : null}
  </section>;
}

function OrderDrawer({ order, onClose }: { order: OrderDto; onClose: () => void }): ReactNode {
  return <div className="fixed inset-0 z-50 bg-background-primary/70 backdrop-blur" role="dialog" aria-modal="true">
    <div className="ml-auto grid h-full w-full max-w-3xl grid-rows-[auto_1fr] border-l border-border bg-background-primary shadow-lg">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">Order Detail</p><h2 className="mt-2 break-all font-display text-2xl text-text-primary">{orderLabel(order)}</h2></div><button type="button" aria-label="Close order detail" onClick={onClose} className="grid h-10 w-10 place-items-center border border-border text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"><X size={16} /></button></div>
      <div className="min-h-0 overflow-auto p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminCard compact><h3 className="text-text-primary">Customer</h3><p className="mt-3 text-sm text-text-secondary">{order.shippingAddress?.fullName}</p><p className="text-sm text-text-secondary">{order.shippingAddress?.phone}</p><p className="mt-2 text-sm text-text-secondary">{[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode].filter(Boolean).join(', ')}</p></AdminCard>
          <AdminCard compact><h3 className="text-text-primary">Payment</h3><p className="mt-3 text-sm text-text-secondary">{order.paymentMethod} · {order.paymentStatus}</p><p className="mt-2 font-mono text-accent-gold">{formatPrice(order.total)}</p><p className="mt-1 text-xs text-text-muted">Subtotal {formatPrice(order.subtotal ?? 0)} · Tax {formatPrice(order.tax ?? 0)} · Shipping {formatPrice(order.shipping ?? 0)}</p></AdminCard>
        </div>
        <AdminCard className="mt-4"><h3 className="text-text-primary">Items</h3><div className="mt-4 grid gap-3">{order.items?.map((item) => <div key={item.sku + item.title} className="grid gap-3 border border-border bg-background-elevated p-3 sm:grid-cols-[56px_1fr_auto]"><img src={item.image} alt={`${item.title}${item.color ? ` — ${item.color}` : ''}`} className="h-14 w-14 object-cover" /><div><p className="text-sm text-text-primary">{item.title}</p><p className="mt-1 text-xs text-text-secondary">{[item.color, item.size].filter(Boolean).join(' / ') || 'Legacy order'}</p><p className="font-mono text-xs text-text-muted">{item.sku}</p></div><p className="font-mono text-sm text-accent-gold">{item.quantity} x {formatPrice(item.price)}</p></div>)}</div></AdminCard>
        <AdminCard className="mt-4"><h3 className="flex items-center gap-2 text-text-primary"><Truck size={16} />Timeline</h3><div className="mt-4 grid gap-3">{(order.timeline ?? []).map((event, index) => <div key={index} className="border-l border-accent-gold pl-4"><p className="text-sm text-text-primary">{event.status}</p><p className="text-xs text-text-muted">{new Date(event.timestamp).toLocaleString('en-IN')}</p>{event.note ? <p className="mt-1 text-sm text-text-secondary">{event.note}</p> : null}</div>)}</div></AdminCard>
      </div>
    </div>
  </div>;
}
