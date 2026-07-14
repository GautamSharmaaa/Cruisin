// Governed by .rules v1.0
'use client';

import { Eye, Search, ShieldCheck, ShoppingBag, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { AdminCard, AdminDataTable, AdminFilters, AdminStat, AdminStatsGrid } from '@/components/dashboard/admin-ui';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useUpdateUser } from '@/hooks/useAdminMutations';
import type { UserDto } from '@/types/dto.types';

export interface UserManagerProps {
  users: UserDto[];
  isLoading: boolean;
}

type UserRole = 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer';

const userId = (user: UserDto): string => user.id ?? user._id ?? user.email;
const roleOptions = Object.entries(COPY.users.roles).map(([value, label]) => ({ value, label }));
const statusOptions = [{ label: 'All statuses', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Verified', value: 'verified' }, { label: 'Unverified', value: 'unverified' }];
const filterRoleOptions = [{ label: 'All roles', value: 'all' }, ...roleOptions];

const formatCurrency = (value = 0): string => new Intl.NumberFormat('en-IN', { currency: 'INR', maximumFractionDigits: 0, style: 'currency' }).format(value);
const formatDate = (value?: string): string => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not recorded';
const userLabel = (user: UserDto): string => user.email || user.name || userId(user);
const statusTone = (user: UserDto): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (!user.isActive) return 'danger';
  if (!user.isVerified) return 'warning';
  return 'success';
};

export function UserManager({ users, isLoading }: UserManagerProps): ReactNode {
  const updateUser = useUpdateUser();
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  const stats = useMemo(() => {
    const customers = users.filter((user) => user.role === 'customer');
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.role !== 'customer').length,
      customerSpend: customers.reduce((sum, user) => sum + (user.totalSpend ?? 0), 0)
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !needle || [user.name, user.email, user.phone, user.lastOrderId, user.lastCouponCode].filter(Boolean).join(' ').toLowerCase().includes(needle);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && user.isActive)
        || (statusFilter === 'inactive' && !user.isActive)
        || (statusFilter === 'verified' && user.isVerified)
        || (statusFilter === 'unverified' && !user.isVerified);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const onUpdate = (user: UserDto): void => {
    const id = userId(user);
    const nextRole = roles[id] ?? user.role;
    const nextActive = active[id] ?? user.isActive;
    if (nextRole === user.role && nextActive === user.isActive) return;
    const message = `Update ${user.email} to role ${nextRole} and ${nextActive ? 'active' : 'inactive'}?`;
    if (window.confirm(message)) updateUser.mutate({ id, role: nextRole, isActive: nextActive });
  };

  if (!isLoading && users.length === 0) return <EmptyPanel title={COPY.users.title} message={COPY.users.empty} />;

  return <section className="grid gap-5">
    <AdminStatsGrid>
      <AdminStat label="Users loaded" value={stats.total} helper="Latest 100 admin records" />
      <AdminStat label="Active accounts" value={stats.active} tone="success" helper="Allowed to sign in" />
      <AdminStat label="Admin roles" value={stats.admins} tone="gold" helper="Admin, manager, viewer, superadmin" />
      <AdminStat label="Customer spend" value={formatCurrency(stats.customerSpend)} helper="Paid order value in this list" />
    </AdminStatsGrid>

    <AdminFilters>
      <div className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-4 top-10 text-text-muted" size={15} />
        <Input label="Search customers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, order, coupon" className="pl-10" />
      </div>
      <div className="w-full sm:w-56"><SelectField label="Role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} options={filterRoleOptions} /></div>
      <div className="w-full sm:w-56"><SelectField label="Account status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} /></div>
    </AdminFilters>

    <AdminDataTable minWidth={1180}>
      <thead className="text-xs uppercase tracking-[0.12em] text-text-secondary">
        <tr>
          <th className="border-b border-border p-4">{COPY.fields.name}</th>
          <th className="border-b border-border p-4">Contact</th>
          <th className="border-b border-border p-4">Orders</th>
          <th className="border-b border-border p-4">Spend</th>
          <th className="border-b border-border p-4">Last order</th>
          <th className="border-b border-border p-4">{COPY.fields.role}</th>
          <th className="border-b border-border p-4">{COPY.fields.active}</th>
          <th className="border-b border-border p-4 text-right">{COPY.table.columns[3]}</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={8}>{COPY.common.loading}</td></tr> : null}
        {!isLoading && filteredUsers.length === 0 ? <tr><td className="p-4 text-text-secondary" colSpan={8}>No users match the current filters.</td></tr> : null}
        {!isLoading ? filteredUsers.map((user) => {
          const id = userId(user);
          return <tr key={id} className="border-b border-border-subtle transition hover:bg-background-overlay/60">
            <td className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center border border-border text-accent-gold"><UserRound size={17} /></div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{user.name}</p>
                  <p className="mt-1 text-xs text-text-muted">Joined {formatDate(user.createdAt)}</p>
                  <p className="mt-2"><StatusPill tone={statusTone(user)}>{!user.isActive ? 'Inactive' : user.isVerified ? 'Verified' : 'Unverified'}</StatusPill></p>
                </div>
              </div>
            </td>
            <td className="p-4 text-text-secondary"><p className="break-all">{user.email}</p><p className="mt-1">{user.phone ?? 'No phone'}</p></td>
            <td className="p-4 font-mono text-text-primary">{user.orderCount ?? 0}</td>
            <td className="p-4 font-mono text-text-primary">{formatCurrency(user.totalSpend)}</td>
            <td className="p-4 text-text-secondary"><p>{formatDate(user.lastOrderAt)}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">{user.lastOrderStatus ?? 'No orders'}{user.lastCouponCode ? ' / ' + user.lastCouponCode : ''}</p></td>
            <td className="p-4"><SelectField label={'Role for ' + userLabel(user)} options={roleOptions} value={roles[id] ?? user.role} onChange={(event) => setRoles((current) => ({ ...current, [id]: event.target.value as UserRole }))} /></td>
            <td className="p-4"><SelectField label={'Active status for ' + userLabel(user)} options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={String(active[id] ?? user.isActive)} onChange={(event) => setActive((current) => ({ ...current, [id]: event.target.value === 'true' }))} /></td>
            <td className="p-4">
              <div className="flex justify-end gap-2">
                <button type="button" aria-label={'View customer details ' + userLabel(user)} onClick={() => setSelectedUser(user)} className="grid h-11 w-11 place-items-center border border-border text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"><Eye size={16} /></button>
                <Button aria-label={'Update user ' + userLabel(user)} onClick={() => onUpdate(user)} disabled={updateUser.isPending}>{COPY.users.update}</Button>
              </div>
            </td>
          </tr>;
        }) : null}
      </tbody>
    </AdminDataTable>

    {updateUser.error ? <p className="text-sm text-danger">{updateUser.error instanceof Error ? updateUser.error.message : 'User update failed.'}</p> : null}

    {selectedUser ? <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} /> : null}
  </section>;
}

function UserDetailDrawer({ user, onClose }: { user: UserDto; onClose: () => void }): ReactNode {
  return <div className="fixed inset-0 z-50 overflow-hidden bg-background-primary/70 backdrop-blur-sm">
    <aside role="dialog" aria-modal="true" aria-label="Customer detail" className="ml-auto grid h-full min-w-0 w-full max-w-xl grid-rows-[auto_1fr] overflow-hidden border-l border-border bg-background-elevated shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">Customer detail</p>
          <h2 className="mt-2 truncate font-display text-2xl text-text-primary">{user.name}</h2>
          <p className="mt-1 break-all text-sm text-text-secondary">{user.email}</p>
        </div>
        <button type="button" aria-label="Close customer details" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold"><X size={16} /></button>
      </div>
      <div className="min-h-0 overflow-y-auto p-5">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <DetailCard icon={<ShieldCheck size={18} />} label="Role" value={COPY.users.roles[user.role] ?? user.role} helper={user.isActive ? 'Active account' : 'Inactive account'} />
          <DetailCard icon={<ShoppingBag size={18} />} label="Orders" value={String(user.orderCount ?? 0)} helper={formatCurrency(user.totalSpend)} />
          <DetailCard label="Last order" value={formatDate(user.lastOrderAt)} helper={user.lastOrderStatus ?? 'No order history'} />
          <DetailCard label="Addresses" value={String(user.addressCount ?? 0)} helper="Saved customer addresses" />
          <DetailCard label="Last login" value={formatDate(user.lastLogin)} helper={user.isVerified ? 'Email verified' : 'Email not verified'} />
          <DetailCard label="Latest payment" value={user.lastPaymentStatus ?? 'None'} helper={user.lastOrderTotal ? formatCurrency(user.lastOrderTotal) : 'No paid order recorded'} />
        </div>
        <AdminCard className="mt-5">
          <h3 className="font-display text-xl text-text-primary">Customer operations</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-muted">Phone</dt><dd className="text-right text-text-primary">{user.phone ?? 'Not set'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-muted">Latest order ID</dt><dd className="break-all text-right text-text-primary">{user.lastOrderId ?? 'None'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-muted">Latest coupon</dt><dd className="text-right text-text-primary">{user.lastCouponCode ?? 'None'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-muted">Created</dt><dd className="text-right text-text-primary">{formatDate(user.createdAt)}</dd></div>
          </dl>
        </AdminCard>
      </div>
    </aside>
  </div>;
}

function DetailCard({ icon, label, value, helper }: { icon?: ReactNode; label: string; value: string; helper?: string }): ReactNode {
  return <AdminCard compact>
    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">{icon}{label}</p>
    <p className="mt-2 break-words font-mono text-xl text-text-primary">{value}</p>
    {helper ? <p className="mt-2 text-xs text-text-secondary">{helper}</p> : null}
  </AdminCard>;
}
