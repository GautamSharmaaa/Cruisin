// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

export function UserManager({ users, isLoading }: UserManagerProps): ReactNode {
  const updateUser = useUpdateUser();
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [active, setActive] = useState<Record<string, boolean>>({});
  const onUpdate = (user: UserDto): void => {
    const id = userId(user);
    updateUser.mutate({ id, role: roles[id] ?? user.role, isActive: active[id] ?? user.isActive });
  };
  return <section className="overflow-x-auto border border-border bg-background-elevated"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.name}</th><th className="border-b border-border p-4">{COPY.auth.email}</th><th className="border-b border-border p-4">{COPY.fields.role}</th><th className="border-b border-border p-4">{COPY.fields.active}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={5}>{COPY.common.loading}</td></tr> : users.map((user) => { const id = userId(user); return <tr key={id} className="border-b border-border-subtle"><td className="p-4 text-text-primary">{user.name}</td><td className="p-4 text-text-secondary">{user.email}</td><td className="p-4"><SelectField label={COPY.fields.role} options={roleOptions} value={roles[id] ?? user.role} onChange={(event) => setRoles((current) => ({ ...current, [id]: event.target.value as UserRole }))} /></td><td className="p-4"><SelectField label={COPY.fields.active} options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={String(active[id] ?? user.isActive)} onChange={(event) => setActive((current) => ({ ...current, [id]: event.target.value === 'true' }))} /></td><td className="p-4"><Button onClick={() => onUpdate(user)} disabled={updateUser.isPending}>{COPY.users.update}</Button></td></tr>; })}</tbody></table></section>;
}
