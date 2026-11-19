'use client';

import Link from 'next/link';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {SafeImage} from '@/components/shared/safe-image';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import {productCardGalleryMotion as motion} from '@/lib/animations';
import type {Product,ProductImage} from '@/types/product.types';

export interface ProductCardGalleryProps { product:Product; priority?:boolean }
interface MouseDrag { pointer:number; x:number; y:number; left:number; index:number; active:boolean }

export function ProductCardGallery({product,priority=false}:ProductCardGalleryProps):ReactNode {
 const experience=useStorefrontExperience();const reduced=useStorefrontReducedMotion();
 const viewport=useRef<HTMLDivElement>(null);
 const drag=useRef<MouseDrag|null>(null);
 const suppressClick=useRef(false);
 const scrollFrame=useRef(0);
 const snapTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const currentRef=useRef(0);
 const measuredWidth=useRef(0);
 const [current,setCurrent]=useState(0);
 const [dragging,setDragging]=useState(false);
 const images=useMemo(()=>{
  const seen=new Set<string>();
  const sources=[...product.images,...(product.hoverImage?[product.hoverImage]:[])];
  const photos=sources.filter(image=>{if(!image.url||seen.has(image.url))return false;seen.add(image.url);return true;});
  return photos.length?photos:[{url:'/cruisin-image-fallback.svg',alt:product.title,width:600,height:800} satisfies ProductImage];
 },[product.images,product.hoverImage,product.title]);
 const identity=images.map(image=>image.url).join('\n');
 const [visited,setVisited]=useState<Set<number>>(()=>new Set([0]));
 const goTo=useCallback((index:number,instant=false):void=>{
  const element=viewport.current;if(!element)return;
  const target=Math.max(0,Math.min(images.length-1,index));
  setVisited(previous=>previous.has(target)?previous:new Set([...previous,target]));
  const immediate=instant||reduced;
  if(immediate){currentRef.current=target;setCurrent(target);}
  clearTimeout(snapTimer.current);element.style.scrollSnapType='none';
  element.scrollTo({left:target*element.clientWidth,behavior:immediate?'instant':'smooth'});
  snapTimer.current=setTimeout(()=>{element.style.scrollSnapType='';},immediate?0:600);
 },[images.length,reduced]);
 useEffect(()=>{
  currentRef.current=0;setCurrent(0);setVisited(new Set([0]));
  if(viewport.current)viewport.current.scrollLeft=0;
 },[product.id,identity]);
 useEffect(()=>{
  const element=viewport.current;if(!element)return;
  measuredWidth.current=element.clientWidth;
  const observer=new ResizeObserver(()=>{
   const width=element.clientWidth;
   if(width>0&&width!==measuredWidth.current){measuredWidth.current=width;goTo(currentRef.current,true);}
  });
  observer.observe(element);
  return()=>{observer.disconnect();cancelAnimationFrame(scrollFrame.current);clearTimeout(snapTimer.current);};
 },[goTo]);
 const position=C.imagePosition.replace('{current}',String(current+1)).replace('{total}',String(images.length));
 return <div className="product-card-gallery" role="group" aria-roledescription={images.length>1?C.imageCarousel:undefined} aria-label={C.productImages.replace('{product}',product.title)} data-image-count={images.length} data-active-image={current+1}>
  <div ref={viewport} className="product-card-gallery-viewport" data-dragging={dragging} tabIndex={images.length>1?0:undefined} data-gallery-scroll
   onScroll={()=>{
    if(scrollFrame.current)return;
    scrollFrame.current=requestAnimationFrame(()=>{
     scrollFrame.current=0;
     const element=viewport.current;
     if(!element)return;
     const width=element.clientWidth;
     // Native snap can scroll a resized gallery before ResizeObserver delivers its new width.
     if(!width||width!==measuredWidth.current)return;
     const index=Math.max(0,Math.min(images.length-1,Math.round(element.scrollLeft/width)));
     if(index===currentRef.current)return;
     currentRef.current=index;
     setCurrent(index);
     setVisited(previous=>previous.has(index)?previous:new Set([...previous,index]));
    });
   }}
   onKeyDown={event=>{if(images.length<2||event.altKey||event.ctrlKey||event.metaKey)return;const next=event.key==='ArrowRight'?currentRef.current+1:event.key==='ArrowLeft'?currentRef.current-1:event.key==='Home'?0:event.key==='End'?images.length-1:null;if(next!==null){event.preventDefault();goTo(next);}}}
   onDragStart={event=>event.preventDefault()}
   onPointerDown={event=>{suppressClick.current=false;if(images.length<2||event.pointerType!=='mouse'||event.button!==0)return;const element=event.currentTarget;drag.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:element.scrollLeft,index:currentRef.current,active:false};}}
   onPointerMove={event=>{const gesture=drag.current;if(!gesture||gesture.pointer!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(!gesture.active){if(Math.abs(dx)<motion.dragStart||Math.abs(dx)<=Math.abs(dy))return;gesture.active=true;suppressClick.current=true;setDragging(true);event.currentTarget.dataset.dragging='true';event.currentTarget.setPointerCapture(event.pointerId);}event.preventDefault();event.currentTarget.scrollLeft=gesture.left-dx;}}
   onPointerUp={event=>{const gesture=drag.current;drag.current=null;if(!gesture?.active)return;setDragging(false);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);const distance=event.clientX-gesture.x,width=event.currentTarget.clientWidth;const steps=Math.abs(distance)>Math.min(width*motion.swipeFraction,motion.maxSwipeThreshold)?Math.max(1,Math.round(Math.abs(distance)/width)):0;const target=gesture.index+(distance<0?steps:-steps);goTo(target);}}
   onPointerCancel={()=>{const gesture=drag.current;drag.current=null;if(!gesture?.active)return;setDragging(false);goTo(currentRef.current,true);}}
   onLostPointerCapture={()=>{drag.current=null;setDragging(false);}}
   onClickCapture={event=>{if(suppressClick.current&&event.detail!==0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}
  >
   {images.map((image,index)=><div className="product-card-gallery-slide" key={image.url} aria-hidden={index!==current}>
    <Link href={`/product/${product.slug}`} prefetch={false} aria-label={product.title} tabIndex={index===current?0:-1} draggable={false}>
     {(Math.abs(index-current)<=2||visited.has(index))&&<SafeImage src={image.url} alt={image.alt||product.title} fill sizes="(min-width:1024px) 25vw, 50vw" priority={priority&&index===0} loading={priority&&index===0?undefined:index===current&&index>0?'eager':'lazy'} className="editorial-product-image" draggable={false}/>}
    </Link>
   </div>)}
  </div>
  {images.length>1&&<>
   {experience.galleryArrowsEnabled&&<div className="product-card-gallery-arrows"><button type="button" onClick={()=>goTo(currentRef.current-1)} disabled={current===0} aria-label={C.previousProductImage.replace('{product}',product.title)}><ChevronLeft size={18} strokeWidth={1.3}/></button><button type="button" onClick={()=>goTo(currentRef.current+1)} disabled={current===images.length-1} aria-label={C.nextProductImage.replace('{product}',product.title)}><ChevronRight size={18} strokeWidth={1.3}/></button></div>}
   {experience.galleryProgressEnabled&&<div className="product-card-gallery-progress" role="progressbar" aria-label={C.imageProgress} aria-valuemin={1} aria-valuemax={images.length} aria-valuenow={current+1} aria-valuetext={position} style={{'--gallery-count':images.length,'--gallery-index':current} as CSSProperties}>{images.map((image,index)=><span key={image.url} data-active={index===current}/>)}</div>}
   <span className="sr-only" aria-live="polite" aria-atomic="true">{position}</span>
  </>}
 </div>;
}
