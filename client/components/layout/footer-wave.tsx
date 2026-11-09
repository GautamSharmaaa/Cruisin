'use client';

import {useEffect,useId,useRef,type ReactNode} from 'react';
import {footerWaveMotion as motion} from '@/lib/animations';

export interface FooterWaveProps { paused:boolean }

/** Decorative liquid light; only advances while visible and motion is allowed. */
export function FooterWave({paused}:FooterWaveProps):ReactNode {
 const svg=useRef<SVGSVGElement>(null);
 const phase=useRef(0);
 const pointer=useRef({x:0,y:0});
 const gradient=useId().replace(/:/g,'');
 useEffect(()=>{
  const element=svg.current;
  const panel=element?.closest<HTMLElement>('footer');
  if(!element||!panel)return;
  const paths=Array.from(element.querySelectorAll('path'));
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  let frame=0;
  let last=0;
  let targetX=0;
  let targetY=0;
  let pointerX=pointer.current.x;
  let pointerY=pointer.current.y;
  const draw=():void=>{
   paths.forEach((path,layer)=>{
    const points:string[]=[];
    for(let x=-80;x<=1520;x+=32){
     const position=x/1440;
     const wave=Math.sin(position*Math.PI*2.2-phase.current+layer*1.7)*motion.amplitude;
     const ripple=Math.sin(position*Math.PI*4.8+phase.current*.73+layer)*motion.ripple;
     const swell=Math.cos(position*Math.PI*1.3-phase.current*.43)*24;
     const pull=Math.exp(-Math.pow((position-(pointerX+1)/2)*3,2))*pointerY*34;
     points.push(`${x},${250+layer*22+wave+ripple+swell+pull}`);
    }
    path.setAttribute('d',`M ${points.join(' L ')} L 1520,500 L -80,500 Z`);
   });
  };
  const tick=(time:number):void=>{
   if(last)phase.current+=Math.min(time-last,50)/1000*motion.speed;
   last=time;
   pointerX+=(targetX-pointerX)*motion.pointerEase;
   pointerY+=(targetY-pointerY)*motion.pointerEase;
   pointer.current={x:pointerX,y:pointerY};
   draw();
   frame=requestAnimationFrame(tick);
  };
  const sync=():void=>{
   cancelAnimationFrame(frame);
   last=0;
   if(visible&&!paused&&!preference.matches&&!document.hidden&&document.documentElement.dataset.themeReveal!=='active')frame=requestAnimationFrame(tick);
   else draw();
  };
  const move=(event:PointerEvent):void=>{
   if(event.pointerType!=='mouse'||paused||preference.matches)return;
   const bounds=panel.getBoundingClientRect();
   targetX=(event.clientX-bounds.left)/bounds.width*2-1;
   targetY=(event.clientY-bounds.top)/bounds.height*2-1;
  };
  const leave=():void=>{targetX=0;targetY=0;};
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;sync();});
  observer.observe(element);
  const transitionObserver=new MutationObserver(sync);
  transitionObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme-reveal']});
  preference.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  panel.addEventListener('pointermove',move,{passive:true});
  panel.addEventListener('pointerleave',leave);
  draw();
  return ()=>{
   cancelAnimationFrame(frame);
   observer.disconnect();
   transitionObserver.disconnect();
   preference.removeEventListener('change',sync);
   document.removeEventListener('visibilitychange',sync);
   panel.removeEventListener('pointermove',move);
   panel.removeEventListener('pointerleave',leave);
  };
 },[paused]);
 return <svg ref={svg} className="cruisin-footer-wave" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop className="cruisin-footer-wave-crest" offset="0%"/><stop className="cruisin-footer-wave-core" offset="34%"/><stop className="cruisin-footer-wave-depth" offset="100%"/></linearGradient></defs>
  {[0,1,2].map(layer=><path key={layer} className={`cruisin-footer-wave-layer cruisin-footer-wave-layer-${layer}`} fill={`url(#${gradient})`}/>)}
 </svg>;
}
