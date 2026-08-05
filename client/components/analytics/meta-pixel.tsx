// Governed by .rules v1.0
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import { initializeMetaPixel, trackPageView } from '@/lib/meta-pixel';

export interface MetaPixelProps {
  pixelId?: string;
}

const bootstrap = `
(function(w){
  if(w.fbq)return;
  var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!w._fbq)w._fbq=n;
  n.push=n;
  n.loaded=true;
  n.version='2.0';
  n.queue=[];
  w.dispatchEvent(new Event('cruisin-meta-bootstrap-ready'));
})(window);
`;

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
    <script id="cruisin-meta-pixel-bootstrap" dangerouslySetInnerHTML={{ __html: bootstrap }} />
    <Script id="cruisin-meta-pixel-library" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
  </>;
}
