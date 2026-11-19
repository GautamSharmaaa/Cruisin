// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { MarketingPreferencesButton } from '@/components/analytics/marketing-preferences-button';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { META_COPY } from '@/constants/meta-copy';
import { usePreferences, useUpdatePreferences } from '@/hooks/useAccount';
import { useMarketingPreference } from '@/lib/meta-consent';
import type { UserPreferences } from '@/types/user.types';

const preferenceKeys: Array<keyof Pick<UserPreferences, 'marketingEmails' | 'orderEmails' | 'pushNotifications' | 'smsNotifications' | 'whatsappNotifications'>> = ['marketingEmails', 'orderEmails', 'pushNotifications', 'smsNotifications', 'whatsappNotifications'];

const preferenceLabels = {
  marketingEmails: COPY.account.marketingEmails,
  orderEmails: COPY.account.orderEmails,
  pushNotifications: COPY.account.pushNotifications,
  smsNotifications: COPY.account.smsNotifications,
  whatsappNotifications: COPY.account.whatsappNotifications
};

export default function PreferencesPage(): ReactNode {
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const marketingPreference = useMarketingPreference();
  const onToggle = (key: keyof typeof preferenceLabels): void => {
    if (!preferences.data) return;
    update.mutate({ [key]: !preferences.data[key] });
  };
  return <main className="px-6 py-28 lg:px-20 lg:py-36"><div className="mx-auto max-w-[800px]"><p className="font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.account.eyebrow}</p><h1 className="mt-4 font-display text-4xl text-text-primary">{COPY.account.preferences}</h1><div className="mt-10 grid gap-px bg-border">{preferenceKeys.map((key) => <article key={key} className="flex items-center justify-between gap-4 bg-background-elevated p-5"><p className="text-sm text-text-primary">{preferenceLabels[key]}</p><button type="button" onClick={() => onToggle(key)} aria-pressed={preferences.data?.[key] ?? false} className={'relative h-7 w-12 border transition ' + (preferences.data?.[key] ? 'border-accent-gold bg-accent-gold' : 'border-border bg-background-input')}><span className={'absolute top-1 h-4 w-4 bg-text-primary transition ' + (preferences.data?.[key] ? 'left-7' : 'left-1')} /></button></article>)}
      {marketingPreference !== 'unavailable' && (
        <section aria-labelledby="profile-marketing-heading" className="flex flex-wrap items-center justify-between gap-4 bg-background-elevated p-5 text-sm text-text-primary">
          <div>
            <h2 id="profile-marketing-heading">{META_COPY.title}</h2>
            <p className="mt-1 text-text-secondary" aria-live="polite">{marketingPreference === 'allowed' ? META_COPY.browserEnabled : META_COPY.browserDisabled}</p>
          </div>
          <MarketingPreferencesButton />
        </section>
      )}
    </div>{update.isSuccess ? <p className="mt-5 text-sm text-success">{COPY.account.saved}</p> : null}<Button className="mt-8" variant="secondary" onClick={() => preferences.refetch()}>{COPY.common.retry}</Button></div></main>;
}
