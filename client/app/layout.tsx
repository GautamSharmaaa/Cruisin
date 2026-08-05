// Governed by .rules v1.0
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { MetaPixel } from '@/components/analytics/meta-pixel';
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
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return <html lang="en" className="dark" data-scroll-behavior="smooth">
    <head>{metaPixelId ? <>
      <script id="cruisin-meta-pixel-bootstrap" src="/meta-pixel-bootstrap.js" />
    </> : null}</head>
    <body>
    <Suspense fallback={null}><MetaPixel pixelId={metaPixelId} /></Suspense>
    {metaPixelId ? <noscript><img height="1" width="1" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`} alt="" /></noscript> : null}
    <Providers><AppChrome>{children}</AppChrome></Providers>
  </body></html>;
}
