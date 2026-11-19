// Governed by .rules v1.0
'use client';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {useStorefrontLinks} from '@/hooks/useMerchandising';
import {menuSurfaceMotion} from '@/lib/animations';
import {AnimatePresence,motion} from 'framer-motion';
import {ArrowLeft,ChevronRight,X} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback,useEffect,useMemo,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {EDITORIAL_COPY as E} from '@/constants/editorial-copy';
import {COPY} from '@/constants/copy';
import {useMobileAuthSheet} from '@/components/auth/mobile-auth-sheet-provider';
import {acquireBodyScrollLock} from '@/lib/body-scroll-lock';
import {useAuthStore} from '@/store/authStore';
import type {CollectionDto,MegaMenuCollectionCardDto,MegaMenuPromoDto,NavigationItemDto} from '@/types/dto.types';
export interface MobileNavProps {open:boolean;onOpenChange:(open:boolean)=>void;items:NavigationItemDto[];}
const fallbackImage = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';
const idOf = (item: { id?: string; _id?: string; slug?: string; title?: string; label?: string }): string => item._id ?? item.id ?? item.slug ?? item.title ?? item.label ?? '';
const isCollection = (value: MegaMenuCollectionCardDto['collectionId']): value is CollectionDto => Boolean(value && typeof value === 'object');
const cardTitle = (card: MegaMenuCollectionCardDto): string => card.titleOverride || (isCollection(card.collectionId) ? card.collectionId.menuCardTitleOverride || card.collectionId.title : E.collection);
const cardHref = (card: MegaMenuCollectionCardDto): string => {
  const slug = card.slugOverride || (isCollection(card.collectionId) ? card.collectionId.slug : '');
  return slug ? '/collections/' + slug : '/collections';
};
const cardImage = (card: MegaMenuCollectionCardDto): string => {
  if (card.mobileImageOverride || card.imageOverride) return card.mobileImageOverride || card.imageOverride || fallbackImage;
  if (!isCollection(card.collectionId)) return fallbackImage;
  return card.collectionId.mobileMenuCardImage || card.collectionId.mobileImage || card.collectionId.menuCardImage || card.collectionId.cardImage || card.collectionId.thumbnailImage || card.collectionId.heroImage || fallbackImage;
};
const promoImage = (promo?: MegaMenuPromoDto | null): string => promo?.mobileImage || promo?.image || fallbackImage;


export function MobileNav({open,onOpenChange,items}:MobileNavProps):ReactNode {
 const reduced=useStorefrontReducedMotion();const experience=useStorefrontExperience();const links=useStorefrontLinks();
 const user=useAuthStore(state=>state.user);const {openMobileAuth}=useMobileAuthSheet();
 const pathname=usePathname();const drawer=useRef<HTMLDivElement>(null);const closeButton=useRef<HTMLButtonElement>(null);const screen=useRef<HTMLDivElement>(null);
 const opener=useRef<HTMLElement|null>(null);
 const releaseScroll=useRef<(()=>void)|null>(null);
 const [selectedId,setSelectedId]=useState<string|null>(null);const [columnId,setColumnId]=useState<string|null>(null);const [backwards,setBackwards]=useState(false);
 const menuItems=useMemo(()=>items.filter(item=>item.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder),[items]);
 const selected=menuItems.find(item=>idOf(item)===selectedId);
 const columns=(selected?.columns??[]).filter(column=>column.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder);
 const column=columns.find(item=>idOf(item)===columnId);
 const close=useCallback(()=>onOpenChange(false),[onOpenChange]);
 useEffect(()=>{if(open){setSelectedId(null);setColumnId(null);setBackwards(false);}},[open]);
 useEffect(()=>{close();},[pathname,close]);
 useEffect(()=>{
  if(!open)return;
  if(!releaseScroll.current){
   opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
   releaseScroll.current=acquireBodyScrollLock();
  }
  const escape=(event:globalThis.KeyboardEvent):void=>{if(event.key==='Escape')close();};
  window.addEventListener('keydown',escape);
  return()=>window.removeEventListener('keydown',escape);
 },[open,close]);
 useEffect(()=>()=>{releaseScroll.current?.();releaseScroll.current=null;},[]);
 const finishClosing=():void=>{
  if(open)return;
  releaseScroll.current?.();
  releaseScroll.current=null;
  if(document.activeElement===document.body&&opener.current?.isConnected)opener.current.focus({preventScroll:true});
  opener.current=null;
 };
 useEffect(()=>{if(open){screen.current?.scrollTo({top:0});if(selectedId!==null)drawer.current?.querySelector<HTMLButtonElement>('[data-menu-back]')?.focus({preventScroll:true});else closeButton.current?.focus({preventScroll:true});}},[open,selectedId,columnId]);
 const back=():void=>{setBackwards(true);if(columnId)setColumnId(null);else setSelectedId(null);};
 const trap=(event:KeyboardEvent<HTMLDivElement>):void=>{
  if(event.key!=='Tab'||!drawer.current)return;
  const targets=Array.from(drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(item=>item.getClientRects().length>0);
  const first=targets[0],last=targets[targets.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 };
 const duration=reduced?0:experience.motionPace==='quick'?menuSurfaceMotion.fade:menuSurfaceMotion.duration;
 const closed=experience.menuAnimation==='fade'?{x:0,opacity:0}:{x:'-100%',opacity:1};
 const cards=(selected?.collectionCards??[]).filter(card=>card.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder);
 const promo=selected?.promo;
 const visibleLinks=(column?.links??(columns.length===1?columns[0].links:[])).filter(link=>link.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder);
 if(typeof document==='undefined')return null;
 return createPortal(<AnimatePresence onExitComplete={finishClosing}>{open&&<motion.button key="menu-backdrop" className="minimal-menu-backdrop" type="button" aria-label={COPY.common.close} tabIndex={-1} onClick={close} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:menuSurfaceMotion.fade}}/>}{open&&<motion.div key="menu" ref={drawer} className="editorial-navigation-drawer reference-menu" initial={reduced?false:closed} animate={{x:0,opacity:1}} exit={closed} transition={{duration,ease:menuSurfaceMotion.ease}} role="dialog" aria-modal="true" aria-label={COPY.nav.menu} onKeyDown={trap}>
  <div className="reference-menu-header">
   {selected?<button type="button" data-menu-back onClick={back}><ArrowLeft size={17} strokeWidth={1.2}/><span>{column?.title??selected.label}</span><span className="sr-only">{E.back}</span></button>:<span/>}
   <button ref={closeButton} type="button" onClick={close} aria-label={COPY.common.close}><X size={23} strokeWidth={1.1}/></button>
  </div>
  <div ref={screen} className="reference-menu-scroll" data-scroll-native>
   <motion.div key={columnId??selectedId??'root'} initial={reduced?false:{opacity:.85,x:experience.menuAnimation==='fade'?0:backwards?-16:16}} animate={{opacity:1,x:0}} transition={{duration:reduced?0:menuSurfaceMotion.fade,ease:menuSurfaceMotion.ease}} className="reference-menu-screen">
    {!selected?<><nav className="reference-menu-links" aria-label={E.menuSections}>{menuItems.map(item=>item.isMegaMenuEnabled?<button key={idOf(item)} type="button" onClick={()=>{setBackwards(false);setSelectedId(idOf(item));}}>{item.label}<ChevronRight size={17} strokeWidth={1.1}/></button>:<Link key={idOf(item)} href={item.href} onClick={close}>{item.label}</Link>)}</nav>
    <nav className="reference-menu-utilities" aria-label={COPY.auth.myAccount}>{links.menuUtilities.map((link,index)=>!user&&link.href.startsWith('/account')?<button type="button" key={index} onClick={()=>{close();openMobileAuth({next:link.href});}}>{link.label}</button>:<Link key={index} href={link.href} onClick={close}>{link.label}</Link>)}</nav></>:<>
     <nav className="reference-menu-links reference-menu-children" aria-label={column?.title??selected.label}>
      {!column&&<Link className="reference-menu-explore" href={selected.href} onClick={close}>{E.explore} {selected.label}</Link>}
      {!column&&columns.length>1?columns.map(item=><button type="button" key={idOf(item)} onClick={()=>{setBackwards(false);setColumnId(idOf(item));}}>{item.title}<ChevronRight size={17} strokeWidth={1.1}/></button>):visibleLinks.map(link=><Link key={idOf(link)||link.href} href={link.href} onClick={close}>{link.label}{link.showArrow&&<ChevronRight size={17} strokeWidth={1.1}/>}</Link>)}
      {!column&&columns.length===0&&cards.map(card=><Link href={cardHref(card)} key={idOf(card)||cardHref(card)} onClick={close}>{cardTitle(card)}</Link>)}
     </nav>
     {(cards.length>0||promo?.isVisible)&&<div className="reference-menu-cards" aria-label={E.collection}>
      {cards.map(card=><Link key={idOf(card)||cardHref(card)} href={cardHref(card)} onClick={close} className="reference-menu-card"><div><Image src={cardImage(card)} alt={cardTitle(card)} fill sizes="(max-width:767px) 66vw, 320px" className="object-cover"/></div><span>{cardTitle(card)}</span></Link>)}
      {promo?.isVisible&&<Link href={promo.buttonHref||selected.href} onClick={close} className="reference-menu-card reference-menu-promo" data-mobile-visible={promo.showOnMobile} data-desktop-visible={promo.showOnDesktop!==false}><div><Image src={promoImage(promo)} alt={promo.title||E.editorial} fill sizes="(max-width:767px) 66vw, 320px" className="object-cover"/></div><span>{promo.buttonLabel||promo.title||E.explore}</span></Link>}
     </div>}
    </>}
   </motion.div>
  </div>
 </motion.div>}</AnimatePresence>,document.body);
}
