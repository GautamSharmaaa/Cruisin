// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StorefrontManager } from '@/components/storefront/storefront-manager';
import { COPY } from '@/constants/copy';

export default async function StorefrontPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }): Promise<ReactNode> {
  const { panel } = await searchParams;
  const tab = panel === 'experience' ? 'settings' : panel === 'mega-menu' || panel === 'pages' ? panel : 'navigation';
  return <div className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title="Storefront" subtitle="Manage navigation, mega menus, collections, filters, page settings, SEO, and global browsing controls." /><StorefrontManager initialTab={tab} /></div>;
}
