// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Cruisin Admin', template: '%s | Cruisin Admin' },
  description: 'Cruisin commerce administration',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } }
};
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark"><body><Providers>{children}</Providers></body></html>; }
