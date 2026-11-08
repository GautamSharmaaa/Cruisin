'use client';
import {useEffect,type ReactNode} from 'react';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {usePathname} from 'next/navigation';
import {MotionConfig} from 'framer-motion';
import Lenis from 'lenis';
import {storefrontEase} from '@/lib/storefront-motion';
export interface SmoothStorefrontProps {children:ReactNode;}
export function SmoothStorefront({children}:SmoothStorefrontProps):ReactNode{
 const pathname=usePathname();const reducedMotion=useStorefrontReducedMotion();
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');const coarse=window.matchMedia('(pointer: coarse)');let lenis:Lenis|undefined;
  const sync=():void=>{
   lenis?.destroy();lenis=undefined;
   if(reduced.matches||coarse.matches||pathname.startsWith('/cms-preview/')||pathname==='/checkout'){
    document.documentElement.dataset.scrollMode='native';return;
   }
   lenis=new Lenis({autoRaf:true,smoothWheel:true,lerp:0.1,anchors:false,prevent:node=>Boolean(node.closest('[role="dialog"],[data-lenis-prevent],textarea,input,select,[data-scroll-native]'))});
   document.documentElement.dataset.scrollMode='smooth';
   checkLock();
  };
  const checkLock=():void=>{if(!lenis)return;if(getComputedStyle(document.body).overflow==='hidden')lenis.stop();else lenis.start();};
  sync();const observer=new MutationObserver(checkLock);observer.observe(document.body,{attributes:true,attributeFilter:['style','class']});
  reduced.addEventListener('change',sync);coarse.addEventListener('change',sync);
  return()=>{lenis?.destroy();observer.disconnect();reduced.removeEventListener('change',sync);coarse.removeEventListener('change',sync);delete document.documentElement.dataset.scrollMode;};
 },[pathname]);
 return <MotionConfig reducedMotion={reducedMotion?'always':'never'} transition={{duration:0.55,ease:storefrontEase}}>{children}</MotionConfig>;
}
