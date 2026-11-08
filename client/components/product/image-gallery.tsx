'use client';
import {useRef,useState,useEffect,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {SafeImage} from '@/components/shared/safe-image';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
import type {ProductImage} from '@/types/product.types';
export interface ImageGalleryProps {images:ProductImage[];}
export function ImageGallery({images}:ImageGalleryProps):ReactNode{
 const gallery=images.length?images:[{url:'/cruisin-image-fallback.svg',alt:C.gallery,width:900,height:1200}];
 const track=useRef<HTMLDivElement>(null);const [active,setActive]=useState(0);const reduced=useStorefrontReducedMotion();const first=gallery[0]?.url;
 useEffect(()=>{setActive(0);track.current?.scrollTo({left:0,behavior:'instant'});},[first]);
 const move=(index:number):void=>{const node=track.current;const slide=node?.children[index] as HTMLElement|undefined;if(!node||!slide)return;node.scrollTo({left:slide.offsetLeft,behavior:reduced?'instant':'smooth'});};
 return <section className="pdp-gallery" aria-label={C.gallery}><div className="pdp-gallery-track" data-scroll-native ref={track} onScroll={()=>{const node=track.current;if(!node)return;const slides=Array.from(node.children) as HTMLElement[];let nearest=0;for(let i=1;i<slides.length;i++)if(Math.abs(slides[i].offsetLeft-node.scrollLeft)<Math.abs(slides[nearest].offsetLeft-node.scrollLeft))nearest=i;setActive(nearest);}}>{gallery.map((image,index)=><div className="pdp-gallery-slide" key={image.url}><SafeImage src={image.url} alt={image.alt} fill sizes="(min-width:1024px) 48vw, 100vw" priority={index<2} className="pdp-gallery-image"/></div>)}</div>{gallery.length>1&&<><div className="pdp-gallery-controls"><button type="button" aria-label={C.previous} disabled={active===0} onClick={()=>move(active-1)}><ChevronLeft size={18}/></button><button type="button" aria-label={C.next} disabled={active===gallery.length-1} onClick={()=>move(active+1)}><ChevronRight size={18}/></button><span aria-live="polite">{active+1} / {gallery.length}</span></div><div className="pdp-gallery-dots">{gallery.map((image,index)=><button key={image.url} type="button" aria-label={`${C.gallery} ${index+1}`} aria-current={active===index?'true':undefined} onClick={()=>move(index)}/>)}</div></>}</section>;
}
