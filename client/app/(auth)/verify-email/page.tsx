// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { VerifyEmailClient } from '@/components/auth/verify-email-client';

export interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps): Promise<ReactNode> {
  const { token = '' } = await searchParams;
  return <VerifyEmailClient token={token} />;
}
