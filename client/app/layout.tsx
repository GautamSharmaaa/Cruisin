// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppChrome } from '@/components/layout/app-chrome';
import { Providers } from '@/components/shared/providers';
import { COPY } from '@/constants/copy';
import './globals.css';

const body = DM_Sans({ subsets: ['latin'], weight: ['300','400','500'], variable: '--font-body', display: 'swap' });
const accent = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-accent', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
export const metadata: Metadata = { title: COPY.brand.name, description: COPY.brand.tagline, metadataBase: new URL('https://cruisin.example') };
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark"><body className={body.variable + ' ' + accent.variable + ' ' + mono.variable}><Providers><AppChrome>{children}</AppChrome></Providers></body></html>; }
