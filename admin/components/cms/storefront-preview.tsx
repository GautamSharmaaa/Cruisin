'use client';
import {useRef,useEffect,type ReactNode} from 'react';
import {cmsPreviewPatchSchema} from '@cruisin/contracts/editorial';
import type {CmsPageDto,CmsSectionDto} from '@/types/dto.types';
import type {CmsSectionInput} from '@/hooks/useAdminMutations';
import {CMS_EDITORIAL_COPY as C} from '@/constants/editorial-copy';
export interface StorefrontPreviewProps {page?:CmsPageDto;selected?:CmsSectionDto;draft:CmsSectionInput;device:'desktop'|'tablet'|'mobile';revision:string;}
export function StorefrontPreview({page,selected,draft,device,revision}:StorefrontPreviewProps):ReactNode{
 const frame=useRef<HTMLIFrameElement>(null);const origin=new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192').origin;
 const send=():void=>{const parsed=cmsPreviewPatchSchema.safeParse({type:'cruisin.cms.preview',sectionId:selected?._id??selected?.id,draft:{title:draft.title,subtitle:draft.subtitle,description:draft.description,content:draft.content,styles:draft.styles,active:draft.active,hideOnDesktop:draft.hideOnDesktop,hideOnMobile:draft.hideOnMobile}});if(parsed.success)frame.current?.contentWindow?.postMessage(parsed.data,origin);};
 useEffect(send,[draft,selected,origin]);
 if(!page?.previewToken)return null;
 return <section className="min-w-0 border border-border bg-background-elevated p-4"><h3 className="text-xl">{C.savedPreview}</h3><div className={'cms-actual-preview cms-actual-preview-'+device}><iframe key={revision+page.slug} ref={frame} title={C.savedPreview} referrerPolicy="no-referrer" onLoad={send} src={`${origin}/cms-preview/${encodeURIComponent(page.slug)}?previewToken=${encodeURIComponent(page.previewToken)}`}/></div></section>;
}
