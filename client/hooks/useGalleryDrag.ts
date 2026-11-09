'use client';
import {useRef,type PointerEvent,type DragEvent} from 'react';
export function useGalleryDrag(){
 const gesture=useRef<{x:number;y:number;left:number;active:boolean}|null>(null);
 return {
 onDragStart:(event:DragEvent<HTMLDivElement>):void=>event.preventDefault(),
 onPointerDown:(event:PointerEvent<HTMLDivElement>):void=>{if(event.pointerType==='mouse'&&event.button===0)gesture.current={x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,active:false};},
 onPointerMove:(event:PointerEvent<HTMLDivElement>):void=>{const drag=gesture.current;if(!drag)return;const dx=event.clientX-drag.x;if(!drag.active){if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(event.clientY-drag.y))return;drag.active=true;event.currentTarget.style.scrollSnapType='none';event.currentTarget.setPointerCapture(event.pointerId);}event.preventDefault();event.currentTarget.scrollLeft=drag.left-dx;},
 onPointerUp:(event:PointerEvent<HTMLDivElement>):void=>{const drag=gesture.current;gesture.current=null;if(!drag?.active)return;const node=event.currentTarget;const slides=Array.from(node.children) as HTMLElement[];const direction=event.clientX<drag.x?1:-1;const start=slides.reduce((best,slide,index)=>Math.abs(slide.offsetLeft-drag.left)<Math.abs(slides[best].offsetLeft-drag.left)?index:best,0);const target=slides[Math.max(0,Math.min(slides.length-1,start+(Math.abs(event.clientX-drag.x)>40?direction:0)))];if(target)node.scrollTo({left:target.offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});window.setTimeout(()=>{node.style.scrollSnapType='';},600);},
 onPointerCancel:(event:PointerEvent<HTMLDivElement>):void=>{gesture.current=null;event.currentTarget.style.scrollSnapType='';},
 };
}
