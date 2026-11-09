// Governed by .rules v1.0
'use client';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';

import {menuSurfaceMotion} from '@/lib/animations';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft,ArrowRight,ChevronDown,Search,ShoppingBag,X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {EDITORIAL_COPY as E} from '@/constants/editorial-copy';
import { COPY } from '@/constants/copy';
import { useMobileAuthSheet } from '@/components/auth/mobile-auth-sheet-provider';
import { ROUTES } from '@/constants/routes';
import { acquireBodyScrollLock } from '@/lib/body-scroll-lock';
import { useAuthStore } from '@/store/authStore';
import type { CollectionDto, MegaMenuCollectionCardDto, MegaMenuPromoDto, NavigationItemDto } from '@/types/dto.types';

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavigationItemDto[];
  onSearch: () => void;
  onCart: () => void;
  cartCount: number;
}
type AccountLink = { label: string; href: string; action?: 'wishlist' | 'orders'; method?: 'whatsapp' | 'alternative' };

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

export function MobileNav({ open, onOpenChange, items, onSearch, onCart, cartCount }: MobileNavProps): ReactNode {
  const reduced=useStorefrontReducedMotion();const experience=useStorefrontExperience();const duration=experience.motionPace==='quick'?menuSurfaceMotion.fade:menuSurfaceMotion.duration;
  const closed=experience.menuAnimation==='fade'?{x:0,opacity:0}:{x:'-100%',opacity:1};
  const [desktop,setDesktop]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(min-width:1024px)');const update=():void=>setDesktop(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const { openMobileAuth } = useMobileAuthSheet();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const menuItems = useMemo(() => items.filter((item) => item.isVisible), [items]);
  const defaultId = idOf(menuItems.find((item) => item.isDefaultActive) ?? menuItems[0] ?? {});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, string | null>>({});
  const close = useCallback((): void => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (open) setExpanded(null);
  }, [defaultId, open]);

  useEffect(() => {
    onOpenChange(false);
  }, [onOpenChange, pathname]);

  useEffect(() => {
    if (!open) return;
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const releaseScrollLock = acquireBodyScrollLock();
    const onEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEscape);
    window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      releaseScrollLock();
      if(opener?.isConnected)opener.focus({preventScroll:true});
      window.removeEventListener('keydown', onEscape);
    };
  }, [close, open]);

  const accountLinks: AccountLink[] = user
    ? [{ label: COPY.nav.wishlist, href: ROUTES.wishlist }, { label: COPY.account.orders, href: ROUTES.orders }, { label: COPY.auth.myAccount, href: ROUTES.account }, { label: COPY.account.preferences, href: ROUTES.preferences }]
    : [{ label: COPY.nav.wishlist, href: ROUTES.wishlist, action: 'wishlist' as const }, { label: COPY.account.orders, href: ROUTES.orders, action: 'orders' as const }, { label: COPY.auth.whatsapp.continue, href: ROUTES.login, method: 'whatsapp' as const }, { label: COPY.auth.whatsapp.useAlternatives, href: ROUTES.login, method: 'alternative' as const }];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab' || !drawerRef.current) return;
    const focusables = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const selected=menuItems.find(item=>idOf(item)===expanded)??menuItems.find(item=>item.isMegaMenuEnabled)??null;
  const accountContent=<div className="minimal-menu-account">{accountLinks.map(link=>{
    const action=link.action;
    if(action)return <button key={link.href} type="button" onClick={()=>{close();openMobileAuth({next:action==='orders'?ROUTES.orders:ROUTES.wishlist});}}>{link.label}</button>;
    if(link.method)return <button key={link.method} type="button" onClick={()=>{close();openMobileAuth({next:pathname,method:link.method});}}>{link.label}</button>;
    return <Link key={link.href} href={link.href} onClick={close}>{link.label}</Link>;
  })}</div>;
  return <AnimatePresence>{open?
    <motion.button key="menu-backdrop" type="button" className="minimal-menu-backdrop" aria-label={COPY.common.close} onClick={close} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:menuSurfaceMotion.fade}}/>:null}{open?<motion.div ref={drawerRef} key="minimal-cruisin-menu" initial={reduced?false:closed} animate={{x:0,opacity:1}} exit={reduced?{opacity:0}:closed} transition={{duration:reduced?0:duration,ease:menuSurfaceMotion.ease}} className="editorial-navigation-drawer minimal-menu" role="dialog" aria-modal="true" aria-label={desktop?E.desktopMenu:COPY.nav.menu} onKeyDown={onKeyDown}>
      <div className="minimal-menu-header">
        <button ref={closeRef} type="button" aria-label={COPY.common.close} onClick={close}><X size={22} strokeWidth={1.3}/></button>
        <Link href={ROUTES.home} onClick={close} className="brand-wordmark-script" data-testid="mobile-menu-wordmark">{COPY.brand.name}</Link>
        <button type="button" aria-label={COPY.nav.cart} onClick={()=>{close();onCart();}}><ShoppingBag size={20} strokeWidth={1.3}/>{cartCount>0?<span className="minimal-menu-count">{cartCount}</span>:null}</button>
      </div>
      <button type="button" onClick={()=>{close();onSearch();}} className="minimal-menu-search" aria-label={COPY.nav.search}><Search size={18} strokeWidth={1.3}/><span>{COPY.nav.search}</span><ArrowRight size={16}/></button>
      <div className="minimal-menu-layout">
        <div className="minimal-menu-primary">
          <nav aria-label={E.menuSections}>
            {!desktop&&expanded?<button type="button" className="editorial-menu-back" onClick={()=>setExpanded(null)}><ArrowLeft size={14}/>{E.back}</button>:null}
            {menuItems.filter(item=>desktop||!expanded||idOf(item)===expanded).map(item=>{
              const key=idOf(item);
              const isOpen=desktop?idOf(selected??{})===key:expanded===key;
              if(!item.isMegaMenuEnabled)return <Link key={key} href={item.href} onClick={close} className="minimal-menu-root">{item.label}<ArrowRight size={18} strokeWidth={1.2}/></Link>;
              return <section key={key}>
                <button type="button" className="minimal-menu-root" aria-expanded={isOpen} onClick={()=>setExpanded(desktop?key:isOpen?null:key)}><span>{item.label}</span><ArrowRight size={18} strokeWidth={1.2}/></button>
                {!desktop?<AnimatePresence initial={false}>{isOpen?<motion.div initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:menuSurfaceMotion.fade}}><MobileMenuContent item={item} expandedColumns={expandedColumns} setExpandedColumns={setExpandedColumns} onClose={close}/></motion.div>:null}</AnimatePresence>:null}
              </section>;
            })}
          </nav>
          {accountContent}
        </div>
        {desktop&&selected?<section className="minimal-menu-detail" aria-label={selected.label} key={idOf(selected)}>
          <Link href={selected.href} onClick={close} className="minimal-menu-all">{E.explore} {selected.label}<ArrowRight size={16}/></Link>
          <MobileMenuContent item={selected} expandedColumns={expandedColumns} setExpandedColumns={setExpandedColumns} onClose={close} desktop/>
        </section>:null}
      </div>
    </motion.div>
  :null}</AnimatePresence>;
}

interface MobileMenuContentProps { item:NavigationItemDto; expandedColumns:Record<string,string|null>; setExpandedColumns:(value:Record<string,string|null>)=>void; onClose:()=>void; desktop?:boolean }
function MobileMenuContent({item,expandedColumns,setExpandedColumns,onClose,desktop=false}:MobileMenuContentProps):ReactNode {
  if (item.menuLayoutType === 'collection-grid' || item.slug === 'collections') {
    return (
      <div className="pb-7 pt-3">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          {(item.collectionCards ?? []).filter((card) => card.isVisible).slice(0, 6).map((card) => (
            <Link key={idOf(card) || cardHref(card)} href={cardHref(card)} onClick={onClose} className="minimal-menu-card group relative aspect-[4/3] overflow-hidden bg-background-elevated">
              <Image src={cardImage(card)} alt={cardTitle(card)} fill sizes="(max-width: 389px) 90vw, 45vw" className="object-cover grayscale transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent" />
              <span className="absolute bottom-4 left-4 right-10 font-display text-[20px] font-light">{cardTitle(card)}</span>
              <ArrowRight size={20} strokeWidth={1.25} className="absolute bottom-4 right-4" />
            </Link>
          ))}
        </div>
        <Link href={item.href || '/collections'} onClick={onClose} className="mt-5 inline-flex min-h-11 items-center gap-4 font-accent text-[11px] uppercase tracking-[0.18em] text-accent-gold">
          <span>{E.viewAll} {item.label}</span>
          <ArrowRight size={17} strokeWidth={1.25} />
        </Link>
        <MobilePromoCard promo={item.promo} onClose={onClose} desktop={desktop}/>
      </div>
    );
  }

  return (
    <div className="minimal-menu-columns">
      {item.columns.filter((column) => column.isVisible).map((column) => {
        const columnKey = idOf(column) || column.title;
        const activeColumn = Object.hasOwn(expandedColumns,idOf(item)) ? expandedColumns[idOf(item)] : idOf(item.columns[0] ?? {});
        const isOpen = desktop || activeColumn === columnKey;
        return (
          <section key={columnKey} className="minimal-menu-column">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between font-accent text-[12px] uppercase tracking-[0.18em] text-accent-gold"
              aria-expanded={isOpen}
              disabled={desktop}
              onClick={() => setExpandedColumns({ ...expandedColumns, [idOf(item)]: isOpen ? null : columnKey })}
            >
              {column.title}
              <ChevronDown size={17} strokeWidth={1.25} className={(isOpen ? 'rotate-180' : '') + ' transition'} />
            </button>
            {isOpen ? (
              <div className="grid gap-1 pb-4">
                {column.links.filter((link) => link.isVisible).map((link) => (
                  <Link key={idOf(link) || link.href} href={link.href} onClick={onClose} className={(link.isHighlighted ? 'text-text-primary' : 'text-text-secondary') + ' flex min-h-11 items-center justify-between text-[16px] font-light'}>
                    <span>{link.label}</span>
                    {link.showArrow || link.label.toLowerCase().startsWith('view all') ? <ArrowRight size={17} strokeWidth={1.25} /> : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
      <MobilePromoCard promo={item.promo} onClose={onClose} desktop={desktop}/>
    </div>
  );
}

interface MobilePromoCardProps { promo?:MegaMenuPromoDto|null; onClose:()=>void; desktop?:boolean }
function MobilePromoCard({promo,onClose,desktop=false}:MobilePromoCardProps):ReactNode {
  const overlay=useRef<HTMLSpanElement>(null);
  useEffect(()=>{overlay.current?.style.setProperty('--menu-promo-opacity',String(promo?.overlayOpacity??0.5));},[promo,desktop]);
  if(!promo||!promo.isVisible||(desktop?promo.showOnDesktop===false:!promo.showOnMobile))return null;
  return (
    <Link href={promo.buttonHref || '/collections'} onClick={onClose} className="minimal-menu-card relative mt-6 block h-[210px] overflow-hidden bg-background-elevated">
      <Image src={promoImage(promo)} alt={promo.title || E.editorial} fill sizes="90vw" className="object-cover grayscale" loading="lazy" />
      <span ref={overlay} className="minimal-menu-promo-overlay absolute inset-0 bg-black"/>
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/88 to-transparent" />
      <span className="relative flex h-full flex-col justify-end p-5">
        {promo.eyebrow ? <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-accent-gold">{promo.eyebrow}</span> : null}
        <span className="mt-2 font-display text-[28px] font-light leading-tight">{promo.title}</span>
        {promo.subtitle ? <span className="mt-2 max-w-[240px] text-sm leading-6 text-text-secondary">{promo.subtitle}</span> : null}
        <span className="mt-4 inline-flex min-h-11 items-center gap-3 font-accent text-[11px] uppercase tracking-[0.16em] text-text-primary">
          {promo.buttonLabel || E.explore}
          <ArrowRight size={17} strokeWidth={1.25} />
        </span>
      </span>
    </Link>
  );
}
