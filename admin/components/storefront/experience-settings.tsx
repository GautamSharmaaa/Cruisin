'use client';
import { LoadingCollectionFields } from './loading-collection-fields';
import Link from 'next/link';
import {useEffect,useState,type ReactNode,type FormEvent} from 'react';
import {storefrontExperienceSchema,DEFAULT_STOREFRONT_EXPERIENCE,type StorefrontExperience} from '@cruisin/contracts/storefront-experience';
import {EXPERIENCE_COPY as C,COLLECTION_EXPERIENCE_COPY as L} from '@/constants/storefront-experience-copy';
import {useSaveStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {Button} from '@/components/ui/button';
import type {SiteSettingsDto} from '@/types/dto.types';
export interface ExperienceSettingsProps {site:SiteSettingsDto;grouped?:boolean;}
export function ExperienceSettings({site,grouped=false}:ExperienceSettingsProps):ReactNode{
 const [section,setSection]=useState<'collections'|'loader'|'motion'>('collections');
 const [value,setValue]=useState<StorefrontExperience>(storefrontExperienceSchema.parse(site.storefrontExperience??DEFAULT_STOREFRONT_EXPERIENCE));const [dirty,setDirty]=useState(false);const save=useSaveStorefrontExperience();
 useEffect(()=>{if(!dirty)setValue(storefrontExperienceSchema.parse(site.storefrontExperience??DEFAULT_STOREFRONT_EXPERIENCE));},[site,dirty]);
 const change=<K extends keyof StorefrontExperience>(key:K,next:StorefrontExperience[K]):void=>{setValue(current=>({...current,[key]:next}));setDirty(true);save.reset();};
 const submit=(event:FormEvent):void=>{event.preventDefault();const parsed=storefrontExperienceSchema.safeParse(value);if(parsed.success)save.mutate(parsed.data,{onSuccess:()=>setDirty(false)});};
 return <form id="storefront-experience" onSubmit={submit} aria-label={C.title} className={grouped ? "cms-experience-form" : "mt-8 grid gap-5 border-t border-border py-6"}><div><h2 className={grouped ? "text-2xl font-semibold" : "text-lg"}>{C.title}</h2><p className="mt-2 text-sm text-text-secondary">{C.description}</p></div>
 {grouped && <nav className="cms-experience-tabs" aria-label={C.title}>
   {([['collections',L.collections],['loader',L.loader],['motion',L.motion]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={section===key} onClick={()=>setSection(key)}>{label}</button>)}
 </nav>}
 {(!grouped || section==='motion') && <div className="grid gap-4"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value.wishlistEnabled} onChange={event=>change('wishlistEnabled',event.target.checked)}/>{C.wishlist}</label>{([['hideHeaderOnScroll',C.hideHeader],['mobilePurchaseDockEnabled',C.purchaseDock],['pageTransitionsEnabled',C.transitions],['galleryArrowsEnabled',C.arrows],['galleryProgressEnabled',C.progress],['imageGradientEnabled',C.gradient]] as const).map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value[key]} onChange={event=>change(key,event.target.checked)}/>{label}</label>)}<div className="grid gap-4 md:grid-cols-2">{([
 ['scrollBehavior',C.scroll,[['smooth',C.smooth],['native',C.native]]],
 ['wishlistAnimation',C.heart,[['pulse',C.pulse],['none',C.none]]],['menuAnimation',C.menu,[['slide',C.slide],['fade',C.fade]]],['motionPace',C.pace,[['calm',C.calm],['quick',C.quick]]],
 ] as const).map(([key,label,options])=><label key={key} className="grid gap-2 text-sm">{label}<select className="h-12 border border-border bg-background-primary px-3" value={value[key]} onChange={event=>{const parsed=storefrontExperienceSchema.safeParse({...value,[key]:event.target.value});if(parsed.success){setValue(parsed.data);setDirty(true);save.reset();}}}>{options.map(([option,text])=><option key={option} value={option}>{text}</option>)}</select></label>)}</div></div>}
 {(!grouped || section==='loader') && <label className="grid gap-2 text-sm">{C.loader}
   <select className="h-12 border border-border bg-background-primary px-3" value={value.pageLoader} onChange={event=>change('pageLoader',event.target.value==='none'?'none':'brand')}>
     <option value="brand">{C.brand}</option><option value="none">{C.none}</option>
   </select>
 </label>}
 {(!grouped || section!=='motion') && <LoadingCollectionFields section={grouped && section!=='motion' ? section : 'both'} value={value} change={change} />}
 <div className={grouped ? "cms-experience-save" : "contents"}><Button type="submit" disabled={!dirty||save.isPending}>{save.isPending?C.saving:C.save}</Button>{save.isSuccess&&<p role="status">{C.saved}</p>}{save.isError&&<p role="alert">{C.failed}</p>}</div><div className="border-t border-border pt-5"><Link href="/cms" className="underline">{C.pages}</Link><p className="mt-2 text-sm text-text-secondary">{C.guide}</p></div></form>;
}
