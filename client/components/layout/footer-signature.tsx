'use client';
import dynamic from 'next/dynamic';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {useTheme} from 'next-themes';
import {DEFAULT_FOOTER_APPEARANCE,footerAppearanceSchema} from '@cruisin/contracts/footer-appearance';
import {useSiteSettings} from '@/hooks/useMerchandising';
const MetallicPaint=dynamic(()=>import('@cruisin/ui/metallic-paint'),{ssr:false});
export interface FooterSignatureProps {}
export function FooterSignature(_props:FooterSignatureProps):ReactNode {
 const site=useSiteSettings();
 const parsed=footerAppearanceSchema.safeParse(site.data?.footerAppearance??{});
 const settings=parsed.success?parsed.data:DEFAULT_FOOTER_APPEARANCE;
 const {content,text,imageUrl,lightColor,darkColor,scale,rotation,metallic,...paint}=settings;
 const brand=content==='logo'?'':text;
 const signature=useRef<HTMLDivElement>(null);
 const {resolvedTheme}=useTheme();
 const [font,setFont]=useState('');
 const [rasterSize,setRasterSize]=useState(480);
 const [nearby,setNearby]=useState(false);
 useEffect(()=>{
  const root=signature.current;
  if(!root)return;
  const observer=new IntersectionObserver(([entry])=>{
   if(!entry.isIntersecting)return;
   setNearby(true);
   observer.disconnect();
  },{rootMargin:'240px'});
  observer.observe(root);
  return()=>observer.disconnect();
 },[]);
 const lettering=useRef<SVGTextElement>(null);
 const [bounds,setBounds]=useState('0 -330 1440 440');
 useLayoutEffect(()=>{
  let active=true;
  const measure=():void=>{
   const text=lettering.current;if(!text||!active)return;
   const box=text.getBBox(),style=getComputedStyle(text);
   setFont(style.fontFamily);
   const width=signature.current?.clientWidth??0;
   setRasterSize(width>=1200?1152:width>=768?768:480);
   const context=document.createElement('canvas').getContext('2d');
   if(context){
    context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink=context.measureText(brand);
    const width=ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,height=ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent;
    if(width>0&&height>0){setBounds(`${-ink.actualBoundingBoxLeft} ${-ink.actualBoundingBoxAscent} ${width} ${height}`);return;}
   }
   if(box.width>0&&box.height>0)setBounds(`${box.x} ${box.y} ${box.width} ${box.height}`);
  };
  const observer=new ResizeObserver(measure);
  if(lettering.current?.ownerSVGElement)observer.observe(lettering.current.ownerSVGElement);
  measure();void document.fonts.ready.then(measure);
  return()=>{active=false;observer.disconnect();};
 },[brand]);
 const light=resolvedTheme==='light';
 const color=light?lightColor:darkColor;
 const style={'--footer-signature-color':color,'--footer-signature-transform':`rotate(${rotation}deg) scale(${scale})`} as CSSProperties;
 return <div ref={signature} className="cruisin-footer-signature" aria-hidden="true" style={style} data-interactive={paint.mouseTilt>0}>
  <div className="cruisin-footer-signature-content">
   {content==='logo' ? <img className="cruisin-footer-signature-fallback" src={imageUrl} alt="" /> :
    <svg className="cruisin-footer-signature-fallback" viewBox={bounds} preserveAspectRatio="none"><text ref={lettering} x="0" y="0">{brand}</text></svg>}
   {metallic&&nearby&&(font||content==='logo')&&<div className="cruisin-footer-signature-paint">
    <MetallicPaint {...paint} text={brand||undefined} imageSrc={content==='logo'?imageUrl:undefined} fontFamily={font||undefined}
     fontWeight={400} color={color} textRasterSize={rasterSize} lightMode={light} stretch={content==='text'} scale={1} />
   </div>}
  </div>
 </div>;
}
