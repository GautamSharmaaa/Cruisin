// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { CmsHomepage } from './cms-homepage';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto } from '@/types/dto.types';

export async function loadPublishedCmsPage(slug: string): Promise<CmsExperienceDto | null> {
  try {
    return (await serverApi.get<ApiEnvelope<CmsExperienceDto>>('/cms/pages/' + encodeURIComponent(slug) + '/public')).data.data;
  } catch {
    return null;
  }
}

export async function PublishedCmsSections({ slug }: { slug: string }): Promise<ReactNode> {
  const cms = await loadPublishedCmsPage(slug);
  return cms?.sections.length ? <CmsHomepage sections={cms.sections} /> : null;
}
