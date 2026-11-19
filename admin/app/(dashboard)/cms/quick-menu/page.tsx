'use client';

import Link from 'next/link';
import { HubAppearanceSettings } from '@/components/storefront/hub-appearance-settings';
import { useAdminSiteSettings } from '@/hooks/useAdminResources';

export default function QuickMenuPage() {
  const site = useAdminSiteSettings();
  return <section className="mx-auto w-full max-w-4xl">
    <Link href="/cms" className="text-sm text-accent-gold">← CMS</Link>
    <h1 className="mt-2 text-2xl font-semibold">Quick menu</h1>
    {site.isError ? <p role="alert">Quick menu settings could not be loaded.</p> : site.data ? <HubAppearanceSettings site={site.data} /> : <p role="status">Loading quick menu settings…</p>}
  </section>;
}
