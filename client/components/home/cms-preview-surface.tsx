'use client';
import {useState,useEffect,type ReactNode} from 'react';
import {cmsPreviewPatchSchema} from '@cruisin/contracts/editorial';
import {CmsHomepage} from './cms-homepage';
import type {CmsSectionDto} from '@/types/dto.types';
export interface CmsPreviewSurfaceProps {sections:CmsSectionDto[];}
export function CmsPreviewSurface({sections}:CmsPreviewSurfaceProps):ReactNode{
 const [draft,setDraft]=useState(sections);
 useEffect(()=>{const receive=(event:MessageEvent):void=>{
  const origin=new URL(process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193').origin;
  if(event.origin!==origin||event.source!==window.parent)return;
  const parsed=cmsPreviewPatchSchema.safeParse(event.data);if(!parsed.success)return;
  setDraft(current=>current.map(section=>String(section._id??section.id)===parsed.data.sectionId?{...section,...parsed.data.draft}:section));
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 return <CmsHomepage sections={draft} preview/>;
}
