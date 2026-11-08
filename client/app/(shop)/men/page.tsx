import {CmsHomepage} from '@/components/home/cms-homepage';
import {serverApi} from '@/lib/server-api';
import type {CmsExperienceDto} from '@/types/dto.types';
import type {ApiEnvelope} from '@/types/api.types';
// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductListingPage } from '@/components/shop/product-listing-page';
import { loadPageSettingsServer, metadataFromSettings } from '@/lib/storefront-server';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPageSettingsServer('landing', 'men');
  return metadataFromSettings(settings, 'Men');
}

export const dynamic='force-dynamic';
export default async function MenPage(): Promise<ReactNode> {
  const settings = await loadPageSettingsServer('landing', 'men');
  let cms:CmsExperienceDto|null=null;
  try{cms=(await serverApi.get<ApiEnvelope<CmsExperienceDto>>('/cms/pages/men/public')).data.data;}catch{/* Keep the real catalog available while the department draft is unpublished. */}
  return <>{cms?.sections.length?<CmsHomepage sections={cms.sections}/>:null}<div id="collection"><ProductListingPage pageType="landing" pageSlug="men" initialSettings={settings} gender="men" /></div></>;
}
