// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { UserManager } from '@/components/dashboard/user-manager';
import { COPY } from '@/constants/copy';
import { useAdminUsers } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const users = useAdminUsers(); return <section className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.users.title} subtitle={COPY.users.subtitle} /><UserManager users={users.data ?? []} isLoading={users.isLoading} />{users.error ? <p className="text-sm text-danger">{COPY.common.error}</p> : null}</section>; }
