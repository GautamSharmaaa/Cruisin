'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {getImageProps} from 'next/image';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {storefrontHeroCaption} from '@/lib/storefront-motion';
import {editorialPresentation,editorialLinkSchema} from '@cruisin/contracts/editorial';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import type {CmsSectionDto} from '@/types/dto.types';
export interface EditorialCampaignProps {section:CmsSectionDto;className?:string;priority?:boolean;}
export function EditorialCampaign({section,className='',priority=false}:EditorialCampaignProps):ReactNode{
 const reduced=useStorefrontReducedMotion();
 const {pageTransitionsEnabled}=useStorefrontExperience();
 const content=section.content??{};const text=(key:string,fallback=''):string=>typeof content[key]==='string'?String(content[key]):fallback;
 const presentation=editorialPresentation(section.styles?.editorial??{});
 const desktop=text('desktopMedia',text('posterImage',section.image??''));const mobile=text('mobileMedia',text('mobileFallbackImage',desktop));
 const [failedMedia,setFailedMedia]=useState(false);
 useEffect(()=>setFailedMedia(false),[desktop,mobile]);
 const heroSource=desktop||mobile;
 const imageOptions={alt:text('altText',section.title),fill:true,sizes:'100vw',quality:85,loading:priority?'eager':'lazy'} as const;
 const heroImage=heroSource?getImageProps({...imageOptions,src:failedMedia?'/cruisin-image-fallback.svg':heroSource}).props:null;
 const phoneImage=mobile&&mobile!==heroSource&&!failedMedia?getImageProps({...imageOptions,src:mobile}).props:null;
 const video=text('videoUrl');
 const campaign=useRef<HTMLElement>(null);
 const player=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const section=campaign.current, element=player.current;
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  if(!section||!element||connection?.saveData)return;
  let visible=false;
  const sync=():void=>{
   if(!visible||document.hidden){element.pause();return;}
   if(!element.hasAttribute('src'))element.src=video;
   void element.play().catch(()=>undefined);
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>=.15;sync();},{threshold:.15});
  observer.observe(section);
  document.addEventListener('visibilitychange',sync);
  return()=>{
   observer.disconnect();
   document.removeEventListener('visibilitychange',sync);
   element.pause();
  };
 },[video,reduced]);
 const link=editorialLinkSchema.safeParse(text('ctaLink',section.cta?.link??'/shop'));const href=link.success?link.data:'/shop';
 return <section ref={campaign} className={`editorial-campaign ${className}`} data-height={presentation.heroHeight} data-caption={presentation.captionAlign} data-overlay={presentation.overlay} data-overlay-strength={Math.round(presentation.overlayStrength/10)*10} data-focus={presentation.focalPoint} data-mobile-focus={presentation.mobileFocalPoint} data-fit={presentation.mediaFit} data-section-id={section._id??section.id}>
  {heroImage&&<picture className="editorial-campaign-media">
   {phoneImage&&<source media="(max-width:767px)" srcSet={phoneImage.srcSet??phoneImage.src} sizes={phoneImage.sizes}/>}
   <img {...heroImage} fetchPriority={priority?'high':undefined} onError={()=>setFailedMedia(true)}/>
  </picture>}
  {video&&!reduced&&<video key={video} ref={player} className="editorial-campaign-video" muted loop playsInline preload="none" aria-hidden="true"
    onPlaying={event=>{event.currentTarget.dataset.playing='true';}}
    onError={event=>{delete event.currentTarget.dataset.playing;}}/>}
  <div className="editorial-campaign-shade" aria-hidden="true"/>
  {presentation.shortcuts.length>0&&<nav aria-label={C.categories} className="editorial-shortcuts">{presentation.shortcuts.map(item=><Link key={item.href+item.label} href={item.href}>{item.label}</Link>)}</nav>}
  <motion.div className="editorial-campaign-caption" variants={storefrontHeroCaption} initial={reduced||!pageTransitionsEnabled?false:"initial"} whileInView="animate" viewport={{once:true,amount:.2}}>{text('campaignLabel')&&<p className="editorial-eyebrow">{text('campaignLabel')}</p>}<h2>{section.title}</h2>{section.subtitle&&<p>{section.subtitle}</p>}<div className="editorial-campaign-buttons">{presentation.buttons?presentation.buttons.map(button=><Link key={button.href+button.label} href={button.href} className="editorial-text-link">{button.label}</Link>):<Link href={href} className="editorial-text-link">{text('ctaText',section.cta?.text??C.shop)}</Link>}</div></motion.div>
 </section>;
}
