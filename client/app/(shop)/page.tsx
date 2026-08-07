// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { CmsHomepage } from '@/components/home/cms-homepage';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto } from '@/types/dto.types';

export const revalidate = 60;

async function loadCmsHome(): Promise<CmsExperienceDto | null> {
  try {
    const response = await serverApi.get<ApiEnvelope<CmsExperienceDto>>('/cms/home');
    return response.data.data;
  } catch (_error: unknown) {
    return null;
  }
}

export default async function HomePage(): Promise<ReactNode> {
  const cms = await loadCmsHome();
  if (cms?.sections.length) return <main><CmsHomepage sections={cms.sections} /></main>;
  return <ProductListingPage pageType="landing" pageSlug="home" featured showCollectionCarousel />;
}
