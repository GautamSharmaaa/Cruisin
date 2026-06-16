// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';

export interface AccountLayoutProps {
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps): ReactNode {
  return <AccountGuard>{children}</AccountGuard>;
}
