'use client';
import {useRef,useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import {cmsPreviewPatchSchema} from '@cruisin/contracts/editorial';
import type {CmsPageDto,CmsSectionDto} from '@/types/dto.types';
import type {CmsSectionInput} from '@/hooks/useAdminMutations';
import {CMS_EDITORIAL_COPY as C} from '@/constants/editorial-copy';
export interface StorefrontPreviewProps {page?:CmsPageDto;selected?:CmsSectionDto;draft:CmsSectionInput;device:'desktop'|'tablet'|'mobile';revision:string;zoom?:string;onSelect?:(id:string)=>void;}
export function StorefrontPreview({page,selected,draft,device,revision,zoom='fit',onSelect}:StorefrontPreviewProps):ReactNode{
 const frame=useRef<HTMLIFrameElement>(null);const bounds=useRef<HTMLDivElement>(null);const [available,setAvailable]=useState(640);const origin=new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192').origin;
 const width=device==='mobile'?390:device==='tablet'?768:1280;const height=device==='mobile'?844:960;const scale=zoom==='fit'?Math.min(1,Math.max(0.1,(available-24)/width)):Number(zoom)/100;
 const send=():void=>{const parsed=cmsPreviewPatchSchema.safeParse({type:'cruisin.cms.preview',sectionId:selected?._id??selected?.id,draft:{title:draft.title,subtitle:draft.subtitle,description:draft.description,content:draft.content,styles:draft.styles,active:draft.active,hideOnDesktop:draft.hideOnDesktop,hideOnMobile:draft.hideOnMobile}});if(parsed.success)frame.current?.contentWindow?.postMessage(parsed.data,origin);};
 useEffect(send,[draft,selected,origin]);
 useEffect(()=>{const node=bounds.current;if(!node)return;const observer=new ResizeObserver(entries=>setAvailable(entries[0]?.contentRect.width??640));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{const receive=(event:MessageEvent):void=>{if(event.origin!==origin||event.source!==frame.current?.contentWindow)return;const data=event.data as unknown;if(data&&typeof data==='object'&&'type' in data&&data.type==='cruisin.cms.ready'){send();return;}if(data&&typeof data==='object'&&'type' in data&&data.type==='cruisin.cms.select'&&'sectionId' in data&&typeof data.sectionId==='string')onSelect?.(data.sectionId);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[onSelect,origin,draft,selected]);
 if(!page?.previewToken)return null;
 const style={'--cms-scale':scale,'--cms-canvas-width':`${width}px`,'--cms-canvas-height':`${height}px`} as CSSProperties;
 return <section className="cms-studio-preview-frame"><div ref={bounds} className="cms-studio-preview-window"><div className="cms-studio-scaled-canvas" style={style}><iframe key={revision+page.slug} ref={frame} title={C.savedPreview} referrerPolicy="no-referrer" onLoad={send} src={`${origin}/cms-preview/${encodeURIComponent(page.slug)}?previewToken=${encodeURIComponent(page.previewToken)}`}/></div></div></section>;
}
