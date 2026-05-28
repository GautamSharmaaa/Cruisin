// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { ResourceTable } from '@/components/dashboard/resource-table';
import { COPY } from '@/constants/copy';
import { useAdminUsers } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const users = useAdminUsers(); return <ResourceTable title={COPY.nav.users} items={users.data ?? []} isLoading={users.isLoading} />; }
