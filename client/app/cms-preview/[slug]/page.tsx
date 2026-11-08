import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {CmsPreviewSurface} from '@/components/home/cms-preview-surface';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto } from '@/types/dto.types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title:'Cruisin draft preview',robots:{index:false,follow:false},referrer:'no-referrer'};
export interface PreviewPageProps {params:Promise<{slug:string}>;searchParams:Promise<{previewToken?:string}>;}
export default async function PreviewPage({params,searchParams}:PreviewPageProps):Promise<ReactNode>{
  const {slug}=await params;const {previewToken}=await searchParams;
  if(!previewToken || !/^[a-z0-9-]+$/.test(slug))notFound();
  let cms:CmsExperienceDto;
  try{const response=await serverApi.get<ApiEnvelope<CmsExperienceDto>>(`/cms/pages/${encodeURIComponent(slug)}/public`,{params:{previewToken},headers:{'Cache-Control':'no-store'}});cms=response.data.data;}catch{notFound();}
  return <main><CmsPreviewSurface sections={cms.sections}/></main>;
}
