// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';
export interface RootLayoutProps { children: ReactNode; }
export default function RootLayout({ children }: RootLayoutProps): ReactNode { return <html lang="en" className="dark"><body><Providers>{children}</Providers></body></html>; }
