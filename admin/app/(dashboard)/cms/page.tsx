// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { CmsBuilder } from '@/components/cms/cms-builder';
import { PageHeader } from '@/components/dashboard/page-header';
import { COPY } from '@/constants/copy';

export default function CmsPage(): ReactNode { return <div className="grid gap-6"><PageHeader eyebrow={COPY.brand.eyebrow} title={COPY.cms.title} subtitle={COPY.cms.subtitle} /><CmsBuilder /></div>; }
