// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { META_COPY } from '@/constants/meta-copy';
import { openMarketingPreferencesEvent, useMarketingPreference } from '@/lib/meta-consent';

export interface MarketingPreferencesButtonProps {}

export function MarketingPreferencesButton(_props: MarketingPreferencesButtonProps): ReactNode {
  const preference = useMarketingPreference();
  if (preference === 'unavailable') return null;
  return <button type="button" className="text-left underline-offset-2 hover:underline"
    onClick={() => window.dispatchEvent(new Event(openMarketingPreferencesEvent))}>
    {META_COPY.settings}
  </button>;
}
