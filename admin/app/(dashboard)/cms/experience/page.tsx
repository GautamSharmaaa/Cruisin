'use client';

import Link from 'next/link';
import { ExperienceSettings } from '@/components/storefront/experience-settings';
import { EXPERIENCE_COPY as C } from '@/constants/storefront-experience-copy';
import { useAdminSiteSettings } from '@/hooks/useAdminResources';

export default function CmsExperiencePage() {
  const site = useAdminSiteSettings();

  return <section className="mx-auto grid w-full max-w-5xl gap-4">
    <Link href="/cms" className="text-sm text-accent-gold">{C.back}</Link>
    {site.isError ? <p role="alert">{C.failed}</p> : site.data ?
      <ExperienceSettings site={site.data} grouped /> : <p role="status">{C.loadingSettings}</p>}
  </section>;
}
