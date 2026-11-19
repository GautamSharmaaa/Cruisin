// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { isMetaStorefrontPath } from '@cruisin/contracts/meta-commerce';
import { META_COPY as C } from '@/constants/meta-copy';
import { syncMetaConsent, syncMetaRevocations } from '@/lib/meta-capi';
import {
  browserOptsOut, getMarketingConsentId, getMetaPixelId, initializeMarketingPreference, marketingDefaultsOn,
  marketingPreferenceEvent, openMarketingPreferencesEvent,
  respectBrowserPrivacy, setMarketingPreference, useMarketingConsentId, useMarketingPreference
} from '@/lib/meta-consent';
import { suspendMetaPixel, trackPageView } from '@/lib/meta-pixel';

export interface MetaPixelProps {}

export function MetaPixel(_props: MetaPixelProps): ReactNode {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const preference = useMarketingPreference();
  const consentId = useMarketingConsentId();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    const update = (): void => {
      if (!getMarketingConsentId()) suspendMetaPixel();
      syncMetaRevocations();
    };
    window.addEventListener(openMarketingPreferencesEvent, open);
    window.addEventListener(marketingPreferenceEvent, update);
    window.addEventListener('storage', update);
    window.addEventListener('online', update);
    return () => {
      window.removeEventListener(openMarketingPreferencesEvent, open);
      window.removeEventListener(marketingPreferenceEvent, update);
      window.removeEventListener('storage', update);
      window.removeEventListener('online', update);
    };
  }, []);

  useEffect(() => {
    if (consentId) void syncMetaConsent({ consentId, pixelId: getMetaPixelId() });
  }, [consentId]);

  useEffect(() => {
    respectBrowserPrivacy();
    initializeMarketingPreference();
    syncMetaRevocations();
    trackPageView(query ? pathname + '?' + query : pathname);
  }, [consentId, pathname, query]);

  if (preference === 'unavailable' || (!settingsOpen && (marketingDefaultsOn || preference !== 'unset' || !isMetaStorefrontPath(pathname)))) return null;
  const privacySignal = browserOptsOut();
  const choose = (choice: 'allowed' | 'declined'): void => {
    setMarketingPreference(choice);
    setSettingsOpen(false);
  };
  return <aside aria-labelledby="marketing-cookies-heading" className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-[95] max-w-sm border border-border bg-background-elevated p-4 text-text-primary shadow-lg md:bottom-6 md:right-auto">
    <h2 id="marketing-cookies-heading" className="text-sm font-semibold">{C.title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{privacySignal ? C.privacySignal : C.detail}{' '}
      <Link href="/privacy-policy" className="underline underline-offset-2">{C.privacyLink}</Link>
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      {!privacySignal && <button type="button" className="min-h-11 flex-1 border border-border-strong px-3 text-sm" onClick={() => choose('allowed')}>{C.allow}</button>}
      <button type="button" className="min-h-11 flex-1 border border-border-strong px-3 text-sm" onClick={() => choose('declined')}>{C.decline}</button>
    </div>
  </aside>;
}
