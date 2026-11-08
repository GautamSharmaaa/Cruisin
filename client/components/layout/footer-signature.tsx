'use client';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {FOOTER_COPY as C} from '@/constants/footer-copy';
export interface FooterSignatureProps {}
export function FooterSignature(_props:FooterSignatureProps):ReactNode {
 const lettering=useRef<SVGTextElement>(null);
 const [bounds,setBounds]=useState('0 -330 1440 440');
 useLayoutEffect(()=>{
  let active=true;
  const measure=():void=>{
   const text=lettering.current;if(!text||!active)return;
   const box=text.getBBox(),style=getComputedStyle(text);
   const context=document.createElement('canvas').getContext('2d');
   if(context){
    context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink=context.measureText(C.brand);
    const width=ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,height=ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent;
    if(width>0&&height>0){setBounds(`${-ink.actualBoundingBoxLeft} ${-ink.actualBoundingBoxAscent} ${width} ${height}`);return;}
   }
   if(box.width>0&&box.height>0)setBounds(`${box.x} ${box.y} ${box.width} ${box.height}`);
  };
  const observer=new ResizeObserver(measure);
  if(lettering.current?.ownerSVGElement)observer.observe(lettering.current.ownerSVGElement);
  measure();void document.fonts.ready.then(measure);
  return()=>{active=false;observer.disconnect();};
 },[]);
 return <div className="cruisin-footer-signature" aria-hidden="true"><svg viewBox={bounds} preserveAspectRatio="none"><text ref={lettering} x="0" y="0">{C.brand}</text></svg></div>;
}
