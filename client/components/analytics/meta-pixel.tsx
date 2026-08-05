// Governed by .rules v1.0
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import { initializeMetaPixel, trackPageView } from '@/lib/meta-pixel';

export interface MetaPixelProps {
  pixelId?: string;
}

export function MetaPixel({ pixelId }: MetaPixelProps): ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedPixelId = pixelId?.trim() ?? '';
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!normalizedPixelId) {
      initializeMetaPixel('');
      return;
    }
    const initializeAndTrack = (): void => {
      if (!initializeMetaPixel(normalizedPixelId)) return;
      trackPageView(routeKey);
    };
    window.addEventListener('cruisin-meta-bootstrap-ready', initializeAndTrack);
    initializeAndTrack();
    return () => window.removeEventListener('cruisin-meta-bootstrap-ready', initializeAndTrack);
  }, [normalizedPixelId, routeKey]);

  if (!normalizedPixelId) return null;
  return <>
    <Script id="cruisin-meta-pixel-library" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
  </>;
}
