// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppChrome } from '@/components/layout/app-chrome';
import { Providers } from '@/components/shared/providers';
import { COPY } from '@/constants/copy';
import { SITE_CONFIG } from '@/constants/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: { default: `${COPY.brand.name} — ${COPY.brand.tagline}`, template: `%s | ${COPY.brand.name}` },
  description: 'Minimal streetwear essentials designed for movement, restraint, and daily wear.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: COPY.brand.name, title: `${COPY.brand.name} — ${COPY.brand.tagline}`, description: 'Minimal streetwear essentials designed for movement, restraint, and daily wear.', url: '/' },
  twitter: { card: 'summary_large_image', title: `${COPY.brand.name} — ${COPY.brand.tagline}`, description: 'Minimal streetwear essentials designed for movement, restraint, and daily wear.' }
};
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark" data-scroll-behavior="smooth"><body><Providers><AppChrome>{children}</AppChrome></Providers></body></html>; }
