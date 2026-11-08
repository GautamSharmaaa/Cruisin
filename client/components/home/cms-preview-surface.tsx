'use client';
import {useState,useEffect,type ReactNode} from 'react';
import {cmsPreviewPatchSchema} from '@cruisin/contracts/editorial';
import {CmsHomepage} from './cms-homepage';
import type {CmsSectionDto} from '@/types/dto.types';
export interface CmsPreviewSurfaceProps {sections:CmsSectionDto[];}
export function CmsPreviewSurface({sections}:CmsPreviewSurfaceProps):ReactNode{
 const [draft,setDraft]=useState(sections);const [embedded,setEmbedded]=useState(false);const [selectedId,setSelectedId]=useState('');
 useEffect(()=>setEmbedded(window.parent!==window),[]);
 useEffect(()=>{const receive=(event:MessageEvent):void=>{
  const origin=new URL(process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193').origin;
  if(event.origin!==origin||event.source!==window.parent)return;
  const parsed=cmsPreviewPatchSchema.safeParse(event.data);if(!parsed.success)return;
  setSelectedId(parsed.data.sectionId);
  setDraft(current=>current.map(section=>String(section._id??section.id)===parsed.data.sectionId?{...section,...parsed.data.draft}:section));
 };window.addEventListener('message',receive);if(window.parent!==window)window.parent.postMessage({type:'cruisin.cms.ready'},new URL(process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193').origin);return()=>window.removeEventListener('message',receive);},[]);
 return <div onClick={event=>{const target=event.target;if(!embedded||!(target instanceof Element))return;const button=target.closest('[data-select-cms-section]');const id=button?.getAttribute('data-select-cms-section');if(!id)return;setSelectedId(id);window.parent.postMessage({type:'cruisin.cms.select',sectionId:id},new URL(process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193').origin);}}><CmsHomepage sections={draft} preview editing={embedded} selectedId={selectedId}/></div>;
}
