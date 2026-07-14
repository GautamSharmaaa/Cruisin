// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountGuard } from '@/components/account/account-guard';

export interface AccountLayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = { title: 'My Account', robots: { index: false, follow: false } };

export default function AccountLayout({ children }: AccountLayoutProps): ReactNode {
  return <AccountGuard>{children}</AccountGuard>;
}
