'use client';
import Link from 'next/link';
import {useEffect,useState,type ReactNode,type FormEvent} from 'react';
import {storefrontExperienceSchema,DEFAULT_STOREFRONT_EXPERIENCE,type StorefrontExperience} from '@cruisin/contracts/storefront-experience';
import {EXPERIENCE_COPY as C} from '@/constants/storefront-experience-copy';
import {useSaveStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {Button} from '@/components/ui/button';
import type {SiteSettingsDto} from '@/types/dto.types';
export interface ExperienceSettingsProps {site:SiteSettingsDto;}
export function ExperienceSettings({site}:ExperienceSettingsProps):ReactNode{
 const [value,setValue]=useState<StorefrontExperience>(storefrontExperienceSchema.parse(site.storefrontExperience??DEFAULT_STOREFRONT_EXPERIENCE));const [dirty,setDirty]=useState(false);const save=useSaveStorefrontExperience();
 useEffect(()=>{if(!dirty)setValue(storefrontExperienceSchema.parse(site.storefrontExperience??DEFAULT_STOREFRONT_EXPERIENCE));},[site,dirty]);
 const change=<K extends keyof StorefrontExperience>(key:K,next:StorefrontExperience[K]):void=>{setValue(current=>({...current,[key]:next}));setDirty(true);save.reset();};
 const submit=(event:FormEvent):void=>{event.preventDefault();const parsed=storefrontExperienceSchema.safeParse(value);if(parsed.success)save.mutate(parsed.data,{onSuccess:()=>setDirty(false)});};
 return <form id="storefront-experience" onSubmit={submit} aria-label={C.title} className="mt-8 grid gap-5 border-t border-border py-6"><div><h3 className="text-lg">{C.title}</h3><p className="mt-2 text-sm text-text-secondary">{C.description}</p></div><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value.wishlistEnabled} onChange={event=>change('wishlistEnabled',event.target.checked)}/>{C.wishlist}</label>{([['pageTransitionsEnabled',C.transitions],['galleryArrowsEnabled',C.arrows],['galleryProgressEnabled',C.progress],['imageGradientEnabled',C.gradient]] as const).map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value[key]} onChange={event=>change(key,event.target.checked)}/>{label}</label>)}<div className="grid gap-4 md:grid-cols-2">{([
 ['scrollBehavior',C.scroll,[['smooth',C.smooth],['native',C.native]]],
 ['wishlistAnimation',C.heart,[['pulse',C.pulse],['none',C.none]]],['menuAnimation',C.menu,[['slide',C.slide],['fade',C.fade]]],['pageLoader',C.loader,[['brand',C.brand],['none',C.none]]],['motionPace',C.pace,[['calm',C.calm],['quick',C.quick]]],
 ] as const).map(([key,label,options])=><label key={key} className="grid gap-2 text-sm">{label}<select className="h-12 border border-border bg-background-primary px-3" value={value[key]} onChange={event=>{const parsed=storefrontExperienceSchema.safeParse({...value,[key]:event.target.value});if(parsed.success){setValue(parsed.data);setDirty(true);save.reset();}}}>{options.map(([option,text])=><option key={option} value={option}>{text}</option>)}</select></label>)}</div><Button type="submit" disabled={!dirty||save.isPending}>{save.isPending?C.saving:C.save}</Button>{save.isSuccess&&<p role="status">{C.saved}</p>}{save.isError&&<p role="alert">{C.failed}</p>}<div className="border-t border-border pt-5"><Link href="/cms" className="underline">{C.pages}</Link><p className="mt-2 text-sm text-text-secondary">{C.guide}</p></div></form>;
}
