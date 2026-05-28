// Governed by .rules v1.0
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';
const body = DM_Sans({ subsets: ['latin'], weight: ['300','400','500'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark"><body className={body.variable + ' ' + mono.variable}><Providers>{children}</Providers></body></html>; }
