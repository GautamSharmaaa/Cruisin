'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {menuSurfaceMotion} from '@/lib/animations';
import {uniqueVariantsBySize} from '@/lib/variant-utils';
import {ChevronDown,X} from 'lucide-react';
import {AddToCartButton} from './add-to-cart-button';
import {COPY} from '@/constants/copy';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
import type {Product,ProductVariant} from '@/types/product.types';

export interface MobilePurchaseDockProps {
 product:Product;
 variant:ProductVariant|null;
 colorVariant:ProductVariant|null;
 onVariantChange:(variant:ProductVariant|null)=>void;
 onColorChange:(variant:ProductVariant)=>void;
}

export function MobilePurchaseDock({product,variant,colorVariant,onVariantChange,onColorChange}:MobilePurchaseDockProps):ReactNode {
 const [selector,setSelector]=useState<'size'|'color'>('size');
 const [selectorOpen,setSelectorOpen]=useState(false);
 const [sizeAboveBar,setSizeAboveBar]=useState(true);
 const opener=useRef<HTMLButtonElement|null>(null);
 const reduced=useStorefrontReducedMotion();const experience=useStorefrontExperience();
 const endMarker=useRef<HTMLSpanElement>(null);
 const panel=useRef<HTMLDivElement>(null);
 // The browser positions the bar. Only the floating quick menu needs the
 // marker, to move out of the way while the bar covers the viewport bottom.
 useEffect(()=>{
  const marker=endMarker.current;
  const controls=panel.current;
  if(!marker||!controls)return;
  const setDocked=(top:number,bottom:number):void=>{
   const docked=String(top>=bottom);
   if(controls.dataset.docked!==docked)controls.dataset.docked=docked;
  };
  const observer=new IntersectionObserver(([entry])=>{
   if(entry)setDocked(entry.boundingClientRect.top,entry.rootBounds?.bottom??window.innerHeight);
  });
  const syncAfterScroll=():void=>setDocked(marker.getBoundingClientRect().top,window.innerHeight);
  observer.observe(marker);
  window.addEventListener('scrollend',syncAfterScroll);
  return()=>{
   observer.disconnect();
   window.removeEventListener('scrollend',syncAfterScroll);
  };
 },[]);
 useEffect(()=>{
  if(!selectorOpen)return;
  const desktop=window.matchMedia('(min-width: 1024px)');
  const closeOnDesktop=():void=>{if(desktop.matches)setSelectorOpen(false);};
  closeOnDesktop();
  desktop.addEventListener('change',closeOnDesktop);
  return()=>desktop.removeEventListener('change',closeOnDesktop);
 },[selectorOpen]);
 const enabled=product.variants.filter(item=>item.enabled!==false);
 const colors=Array.from(new Set(enabled.map(item=>item.color)));
 const color=colorVariant?.color??colors[0]??'';
 const sizes=uniqueVariantsBySize(enabled.filter(item=>item.color===color));
 const openSelector=(kind:'size'|'color',button:HTMLButtonElement):void=>{
  opener.current=button;
  if(kind==='size'){
   const bottom=panel.current?.getBoundingClientRect().bottom??0;
   setSizeAboveBar(Math.abs(bottom-window.innerHeight)<2);
  }
  setSelector(kind);
  setSelectorOpen(true);
 };
 const selectorStyle=(node:HTMLDivElement|null):void=>{node?.style.setProperty('--selector-duration',`${reduced?0:(experience.motionPace==='quick'?menuSurfaceMotion.fade:menuSurfaceMotion.duration)*1000}ms`);};
 return <Dialog.Root open={selectorOpen} onOpenChange={setSelectorOpen}><div className="pdp-dock-anchor">
  <div ref={panel} className="pdp-mobile-dock" data-docked="true" role="region" aria-label={C.purchaseControls}>
   <div className="pdp-dock-selectors">
    <button type="button" aria-haspopup="dialog" aria-expanded={selectorOpen&&selector==='color'} aria-label={`${C.selectColor}: ${color}`} onClick={event=>openSelector('color',event.currentTarget)}><span>{color||C.selectColor}</span><ChevronDown size={15} aria-hidden="true"/></button>
    <button type="button" aria-haspopup="dialog" aria-expanded={selectorOpen&&selector==='size'} aria-label={`${C.selectSize}${variant?`: ${variant.size}`:''}`} onClick={event=>openSelector('size',event.currentTarget)}><span>{variant?.size??C.selectSize}</span><ChevronDown size={15} aria-hidden="true"/></button>
   </div>
   <AddToCartButton product={product} variant={variant} showSizePrompt={false}/>
  </div>
 </div>
 <span ref={endMarker} className="pdp-dock-end" aria-hidden="true" />
 <Dialog.Portal>
  <Dialog.Overlay className="pdp-selector-backdrop"/>
  <Dialog.Content ref={selectorStyle} data-product-selector={selector} data-above-bar={selector==='size'&&sizeAboveBar} className={selector==='color'?'pdp-color-dialog':'pdp-size-dialog'} aria-describedby={undefined} onCloseAutoFocus={event=>{event.preventDefault();opener.current?.focus({preventScroll:true});}}>
   <div className="pdp-selector-heading"><Dialog.Title>{selector==='color'?C.selectColor:C.selectSize}</Dialog.Title><Dialog.Close aria-label={COPY.common.close}><X size={22} strokeWidth={1.1}/></Dialog.Close></div>
   <div className="pdp-selector-options" data-scroll-native>
    {selector==='color'?colors.map(value=>{
     const representative=enabled.find(item=>item.color===value&&item.stock>0)??enabled.find(item=>item.color===value);
     const photo=representative?.images[0]??product.images[0];
     return <button key={value} type="button" className="pdp-color-option" aria-pressed={color===value} onClick={()=>{if(representative&&value!==color){onColorChange(representative);onVariantChange(null);}setSelectorOpen(false);}}>{photo&&<span className="pdp-color-thumbnail"><Image src={photo.url} alt="" fill sizes="52px" className="object-cover"/></span>}<span>{value}</span></button>;
    }):sizes.map(item=><button key={item.id} type="button" className="pdp-size-option" disabled={item.stock<=0} aria-pressed={variant?.id===item.id} aria-label={`${item.size}${item.stock<=0?` — ${C.soldOut}`:''}`} onClick={()=>{onVariantChange(item);setSelectorOpen(false);}}>{item.size}</button>)}
   </div>
  </Dialog.Content>
 </Dialog.Portal>
 </Dialog.Root>;
}
