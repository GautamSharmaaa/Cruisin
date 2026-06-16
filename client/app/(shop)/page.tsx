// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { BestSellers } from '@/components/home/best-sellers';
import { CmsHomepage } from '@/components/home/cms-homepage';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { FlashSale } from '@/components/home/flash-sale';
import { HeroSection } from '@/components/home/hero-section';
import { InstagramSection } from '@/components/home/instagram-section';
import { NewArrivals } from '@/components/home/new-arrivals';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto } from '@/types/dto.types';

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
  if (cms?.sections.length) return <CmsHomepage sections={cms.sections} />;
  return <><HeroSection /><FeaturedCollections /><FlashSale /><BestSellers /><NewArrivals /><InstagramSection /><NewsletterSection /></>;
}
