import type { ReactNode } from 'react';
import { AuthPage } from '@/components/auth/auth-page';

export default function RegisterPage(): ReactNode {
  return <AuthPage initialTab="signup" />;
}
