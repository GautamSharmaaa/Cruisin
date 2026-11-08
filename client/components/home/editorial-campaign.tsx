'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {useEffect,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {storefrontHeroImage,storefrontHeroCaption} from '@/lib/storefront-motion';
import {editorialPresentation,editorialLinkSchema} from '@cruisin/contracts/editorial';
import {SafeImage} from '@/components/shared/safe-image';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import type {CmsSectionDto} from '@/types/dto.types';
export interface EditorialCampaignProps {section:CmsSectionDto;className?:string;}
export function EditorialCampaign({section,className=''}:EditorialCampaignProps):ReactNode{
 const reduced=useStorefrontReducedMotion();
 const content=section.content??{};const text=(key:string,fallback=''):string=>typeof content[key]==='string'?String(content[key]):fallback;
 const presentation=editorialPresentation(section.styles?.editorial??{});
 const desktop=text('desktopMedia',text('posterImage',section.image??''));const mobile=text('mobileMedia',text('mobileFallbackImage',desktop));
 const video=text('videoUrl');const [play,setPlay]=useState(false);
 useEffect(()=>{const motion=window.matchMedia('(prefers-reduced-motion: reduce)');const update=():void=>setPlay(!motion.matches&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);update();motion.addEventListener('change',update);return()=>motion.removeEventListener('change',update);},[]);
 const link=editorialLinkSchema.safeParse(text('ctaLink',section.cta?.link??'/shop'));const href=link.success?link.data:'/shop';
 return <section className={`editorial-campaign ${className}`} data-height={presentation.heroHeight} data-caption={presentation.captionAlign} data-overlay={presentation.overlay} data-overlay-strength={Math.round(presentation.overlayStrength/10)*10} data-focus={presentation.focalPoint} data-mobile-focus={presentation.mobileFocalPoint} data-fit={presentation.mediaFit} data-section-id={section._id??section.id}>
  {desktop&&<motion.div className="editorial-campaign-media" variants={storefrontHeroImage} initial={reduced?false:"initial"} animate="animate"><SafeImage src={desktop} alt={text('altText',section.title)} fill sizes="100vw" priority className="editorial-campaign-desktop"/>{mobile&&<SafeImage src={mobile} alt={text('altText',section.title)} fill sizes="100vw" priority className="editorial-campaign-mobile"/>}</motion.div>}
  {video&&play&&<video className="editorial-campaign-video" src={video} poster={desktop||undefined} autoPlay muted loop playsInline preload="metadata"/>}
  <div className="editorial-campaign-shade" aria-hidden="true"/>
  {presentation.shortcuts.length>0&&<nav aria-label={C.categories} className="editorial-shortcuts">{presentation.shortcuts.map(item=><Link key={item.href+item.label} href={item.href}>{item.label}</Link>)}</nav>}
  <motion.div className="editorial-campaign-caption" variants={storefrontHeroCaption} initial={reduced?false:"initial"} animate="animate">{text('campaignLabel')&&<p className="editorial-eyebrow">{text('campaignLabel')}</p>}<h2>{section.title}</h2>{section.subtitle&&<p>{section.subtitle}</p>}<div className="editorial-campaign-buttons">{presentation.buttons?presentation.buttons.map(button=><Link key={button.href+button.label} href={button.href} className="editorial-text-link">{button.label}</Link>):<Link href={href} className="editorial-text-link">{text('ctaText',section.cta?.text??C.shop)}</Link>}</div></motion.div>
 </section>;
}
