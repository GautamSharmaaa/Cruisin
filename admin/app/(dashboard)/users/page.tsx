// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { UserManager } from '@/components/dashboard/user-manager';
import { useAdminUsers } from '@/hooks/useAdminResources';
export default function TablePage(): ReactNode { const users = useAdminUsers(); return <UserManager users={users.data ?? []} isLoading={users.isLoading} />; }
