// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppChrome } from '@/components/layout/app-chrome';
import { Providers } from '@/components/shared/providers';
import { COPY } from '@/constants/copy';
import './globals.css';

export const metadata: Metadata = { title: COPY.brand.name, description: COPY.brand.tagline, metadataBase: new URL('https://cruisin.example') };
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark" data-scroll-behavior="smooth"><body><Providers><AppChrome>{children}</AppChrome></Providers></body></html>; }
