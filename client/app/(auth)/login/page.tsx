import type { ReactNode } from 'react';
import { AuthPage } from '@/components/auth/auth-page';

export default function LoginPage(): ReactNode {
  return <AuthPage initialTab="signin" />;
}
