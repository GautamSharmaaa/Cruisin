// Governed by .rules v1.0
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Search, ShoppingBag, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { COPY } from '@/constants/copy';
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

const fallbackImage = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85';
const idOf = (item: { id?: string; _id?: string; slug?: string; title?: string; label?: string }): string => item._id ?? item.id ?? item.slug ?? item.title ?? item.label ?? '';
const isCollection = (value: MegaMenuCollectionCardDto['collectionId']): value is CollectionDto => Boolean(value && typeof value === 'object');
const cardTitle = (card: MegaMenuCollectionCardDto): string => card.titleOverride || (isCollection(card.collectionId) ? card.collectionId.menuCardTitleOverride || card.collectionId.title : 'Collection');
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
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const menuItems = useMemo(() => items.filter((item) => item.isVisible && item.isMegaMenuEnabled), [items]);
  const defaultId = idOf(menuItems.find((item) => item.isDefaultActive) ?? menuItems[0] ?? {});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, string | null>>({});
  const close = useCallback((): void => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (open) setExpanded((current) => current ?? defaultId);
  }, [defaultId, open]);

  useEffect(() => {
    onOpenChange(false);
  }, [onOpenChange, pathname]);

  useEffect(() => {
    if (!open) return;
    const releaseScrollLock = acquireBodyScrollLock();
    const onEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEscape);
    window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', onEscape);
    };
  }, [close, open]);

  const accountLinks = user
    ? [{ label: COPY.nav.wishlist, href: ROUTES.wishlist }, { label: COPY.auth.myAccount, href: ROUTES.account }, { label: COPY.account.preferences, href: ROUTES.preferences }]
    : [{ label: COPY.auth.signIn, href: ROUTES.login }, { label: COPY.auth.createAccount, href: ROUTES.register }];

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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={drawerRef}
          key="mobile-luxury-menu"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[90] h-dvh overflow-y-auto overflow-x-hidden bg-[#050505] text-text-primary lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={COPY.nav.menu}
          onKeyDown={onKeyDown}
        >
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#050505]/95 px-4 pb-4 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-2xl">
            <div className="grid h-16 grid-cols-[48px_1fr_48px] items-center">
              <button ref={closeRef} type="button" aria-label={COPY.common.close} onClick={close} className="grid h-11 w-11 place-items-center text-text-primary transition hover:text-accent-gold">
                <X size={23} strokeWidth={1.25} />
              </button>
              <Link href={ROUTES.home} onClick={close} className="text-center">
                <span className="block font-display text-2xl leading-none">{COPY.brand.name}</span>
                <span className="mt-1 block font-accent text-[9px] uppercase tracking-[0.2em] text-text-muted">{COPY.brand.tagline}</span>
              </Link>
              <button type="button" aria-label={COPY.nav.cart} onClick={() => { close(); onCart(); }} className="relative grid h-11 w-11 place-items-center text-text-primary transition hover:text-accent-gold">
                <ShoppingBag size={20} strokeWidth={1.35} />
                {cartCount > 0 ? <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center bg-accent-gold px-1 font-mono text-[10px] text-text-inverse">{cartCount}</span> : null}
              </button>
            </div>
            <button type="button" onClick={() => { close(); onSearch(); }} className="mt-3 flex min-h-11 w-full items-center gap-3 border border-white/12 px-4 text-left text-[12px] uppercase tracking-[0.18em] text-text-secondary" aria-label={COPY.nav.search}>
              <Search size={18} strokeWidth={1.4} />
              <span>Search Cruisin</span>
            </button>
          </div>

          <nav className="grid gap-1 px-5 py-6 pb-[calc(env(safe-area-inset-bottom)+32px)]" aria-label="Mobile menu sections">
            {menuItems.map((item) => {
              const key = idOf(item);
              const isOpen = expanded === key;
              return (
                <section key={key} className="border-b border-white/10">
                  <button
                    type="button"
                    className={(isOpen ? 'text-text-primary' : 'text-text-secondary') + ' relative flex min-h-16 w-full items-center justify-between py-2 pl-4 text-left font-display text-[28px] font-light transition'}
                    aria-expanded={isOpen}
                    aria-current={isOpen ? 'page' : undefined}
                    onClick={() => setExpanded(isOpen ? null : key)}
                  >
                    <span className={(isOpen ? 'opacity-100' : 'opacity-0') + ' absolute left-0 h-7 w-px bg-accent-gold transition-opacity'} />
                    <span>{item.label}</span>
                    <ChevronDown size={19} strokeWidth={1.25} className={(isOpen ? 'rotate-180 text-accent-gold' : 'text-text-muted') + ' transition'} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <MobileMenuContent item={item} expandedColumns={expandedColumns} setExpandedColumns={setExpandedColumns} onClose={close} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>
              );
            })}
            <div className="mt-6 grid gap-1 border-t border-white/10 pt-4">
              {accountLinks.map((link) => <Link key={link.href} href={link.href} onClick={close} className="flex min-h-11 items-center text-[12px] uppercase tracking-[0.16em] text-text-secondary">{link.label}</Link>)}
            </div>
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MobileMenuContent({ item, expandedColumns, setExpandedColumns, onClose }: { item: NavigationItemDto; expandedColumns: Record<string, string | null>; setExpandedColumns: (value: Record<string, string | null>) => void; onClose: () => void }): ReactNode {
  if (item.menuLayoutType === 'collection-grid' || item.slug === 'collections') {
    return (
      <div className="pb-7 pt-3">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          {(item.collectionCards ?? []).filter((card) => card.isVisible).slice(0, 6).map((card) => (
            <Link key={idOf(card) || cardHref(card)} href={cardHref(card)} onClick={onClose} className="group relative aspect-[4/3] overflow-hidden rounded-[6px] bg-background-elevated">
              <Image src={cardImage(card)} alt={cardTitle(card)} fill sizes="(max-width: 389px) 90vw, 45vw" className="object-cover grayscale transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent" />
              <span className="absolute bottom-4 left-4 right-10 font-display text-[20px] font-light">{cardTitle(card)}</span>
              <ArrowRight size={20} strokeWidth={1.25} className="absolute bottom-4 right-4" />
            </Link>
          ))}
        </div>
        <Link href={item.href || '/collections'} onClick={onClose} className="mt-5 inline-flex min-h-11 items-center gap-4 font-accent text-[11px] uppercase tracking-[0.18em] text-accent-gold">
          <span>View All {item.label}</span>
          <ArrowRight size={17} strokeWidth={1.25} />
        </Link>
        <MobilePromoCard promo={item.promo} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="pb-7 pt-2">
      {item.columns.filter((column) => column.isVisible).map((column) => {
        const columnKey = idOf(column) || column.title;
        const activeColumn = expandedColumns[idOf(item)] ?? idOf(item.columns[0] ?? {});
        const isOpen = activeColumn === columnKey;
        return (
          <section key={columnKey} className="border-t border-white/10">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between font-accent text-[12px] uppercase tracking-[0.18em] text-accent-gold"
              aria-expanded={isOpen}
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
      <MobilePromoCard promo={item.promo} onClose={onClose} />
    </div>
  );
}

function MobilePromoCard({ promo, onClose }: { promo?: MegaMenuPromoDto | null; onClose: () => void }): ReactNode {
  if (!promo || !promo.isVisible || !promo.showOnMobile) return null;
  return (
    <Link href={promo.buttonHref || '/collections'} onClick={onClose} className="relative mt-6 block h-[210px] overflow-hidden rounded-[6px] border border-white/10 bg-background-elevated">
      <Image src={promoImage(promo)} alt={promo.title || 'Cruisin editorial'} fill sizes="90vw" className="object-cover grayscale" loading="lazy" />
      <span className="absolute inset-0 bg-black" style={{ opacity: promo.overlayOpacity ?? 0.5 }} />
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/88 to-transparent" />
      <span className="relative flex h-full flex-col justify-end p-5">
        {promo.eyebrow ? <span className="font-accent text-[10px] uppercase tracking-[0.2em] text-accent-gold">{promo.eyebrow}</span> : null}
        <span className="mt-2 font-display text-[28px] font-light leading-tight">{promo.title}</span>
        {promo.subtitle ? <span className="mt-2 max-w-[240px] text-sm leading-6 text-text-secondary">{promo.subtitle}</span> : null}
        <span className="mt-4 inline-flex min-h-11 items-center gap-3 font-accent text-[11px] uppercase tracking-[0.16em] text-text-primary">
          {promo.buttonLabel || 'Explore'}
          <ArrowRight size={17} strokeWidth={1.25} />
        </span>
      </span>
    </Link>
  );
}
