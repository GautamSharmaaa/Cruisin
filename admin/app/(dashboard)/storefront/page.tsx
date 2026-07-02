// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StorefrontManager } from '@/components/storefront/storefront-manager';
import { COPY } from '@/constants/copy';

export default function StorefrontPage(): ReactNode {
  return <div className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title="Storefront" subtitle="Manage navigation, mega menus, collections, filters, page settings, SEO, and global browsing controls." /><StorefrontManager /></div>;
}
