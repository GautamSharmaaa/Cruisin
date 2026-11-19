// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { COPY } from '@/constants/copy';
import './globals.css';
import '@cruisin/ui/styles.css';
export const metadata: Metadata = {
  title: COPY.brand.name,
  description: 'Cruisin commerce administration',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } }
};
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="cruisin-admin" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>; }
