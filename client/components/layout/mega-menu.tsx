// Governed by .rules v1.0
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { acquireBodyScrollLock } from '@/lib/body-scroll-lock';
import type { CollectionDto, MegaMenuCollectionCardDto, MegaMenuPromoDto, NavigationItemDto } from '@/types/dto.types';

export interface MegaMenuProps {
  items: NavigationItemDto[];
  activeItem: NavigationItemDto | null;
  activeId: string | null;
  onActiveChange: (id: string) => void;
  onClose: () => void;
}

const fallbackImage = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=85';
const navId = (item: NavigationItemDto): string => item._id ?? item.id ?? item.slug;
const objectId = (item: { id?: string; _id?: string }): string => item._id ?? item.id ?? '';
const visibleItems = (items: NavigationItemDto[]): NavigationItemDto[] => items.filter((item) => item.isVisible && item.isMegaMenuEnabled);
const isCollection = (value: MegaMenuCollectionCardDto['collectionId']): value is CollectionDto => Boolean(value && typeof value === 'object');

const cardTitle = (card: MegaMenuCollectionCardDto): string => {
  if (card.titleOverride) return card.titleOverride;
  return isCollection(card.collectionId) ? card.collectionId.menuCardTitleOverride || card.collectionId.title : 'Collection';
};

const cardHref = (card: MegaMenuCollectionCardDto): string => {
  const slug = card.slugOverride || (isCollection(card.collectionId) ? card.collectionId.slug : '');
  return slug ? '/collections/' + slug : '/collections';
};

const cardImage = (card: MegaMenuCollectionCardDto, mobile = false): string => {
  if (mobile && card.mobileImageOverride) return card.mobileImageOverride;
  if (card.imageOverride) return card.imageOverride;
  if (!isCollection(card.collectionId)) return fallbackImage;
  return (mobile ? card.collectionId.mobileMenuCardImage || card.collectionId.mobileImage : '') || card.collectionId.menuCardImage || card.collectionId.cardImage || card.collectionId.thumbnailImage || card.collectionId.heroImage || card.collectionId.bannerImage || fallbackImage;
};

const promoImage = (promo: MegaMenuPromoDto | null | undefined): string => promo?.image || promo?.mobileImage || fallbackImage;

export function MegaMenu({ items, activeItem, activeId, onActiveChange, onClose }: MegaMenuProps): ReactNode {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const menuItems = useMemo(() => visibleItems(items), [items]);
  const item = activeItem && activeItem.isMegaMenuEnabled ? activeItem : null;

  useEffect(() => {
    if (!item) return;
    return acquireBodyScrollLock();
  }, [item]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !overlayRef.current) return;
    const focusables = Array.from(overlayRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')).filter((node) => !node.hasAttribute('aria-hidden'));
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
      {item ? (
        <motion.div
          ref={overlayRef}
          key="luxury-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[80] hidden h-dvh overflow-hidden bg-[#050505] text-text-primary lg:block"
          role="dialog"
          aria-modal="true"
          aria-label="Cruisin menu"
          onKeyDown={onKeyDown}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,184,126,0.08),transparent_32%),linear-gradient(115deg,rgba(255,255,255,0.03),transparent_42%)]" />
          <div className="relative mt-20 grid h-[calc(100dvh-80px)] grid-cols-[304px_minmax(0,1fr)_392px] border-t border-white/10">
            <MenuLeftRail items={menuItems} activeId={activeId ?? navId(item)} onActiveChange={onActiveChange} onClose={onClose} />
            <MenuContent item={item} onClose={onClose} />
            <MenuPromoPanel promo={item.promo} fallbackTitle={item.label} onClose={onClose} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MenuLeftRail({ items, activeId, onActiveChange, onClose }: { items: NavigationItemDto[]; activeId: string; onActiveChange: (id: string) => void; onClose: () => void }): ReactNode {
  return (
    <nav aria-label="Menu sections" className="border-r border-white/12 px-0 py-24">
      <div className="grid gap-8">
        {items.map((item) => {
          const id = navId(item);
          const active = id === activeId;
          return item.menuLayoutType === 'custom-link' ? (
            <Link key={id} href={item.href} onClick={onClose} className="group relative flex h-11 items-center px-12 font-display text-[26px] font-light text-text-secondary transition hover:text-text-primary">
              <span>{item.label}</span>
            </Link>
          ) : (
            <button
              key={id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onMouseEnter={() => onActiveChange(id)}
              onFocus={() => onActiveChange(id)}
              onClick={() => onActiveChange(id)}
              className={(active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary') + ' group relative flex h-11 items-center px-12 text-left font-display text-[26px] font-light transition'}
            >
              <span className={(active ? 'w-8 opacity-100' : 'w-0 opacity-0 group-hover:w-6 group-hover:opacity-70') + ' absolute left-0 h-px bg-accent-gold transition-all'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MenuContent({ item, onClose }: { item: NavigationItemDto; onClose: () => void }): ReactNode {
  if (item.menuLayoutType === 'collection-grid' || item.slug === 'collections') {
    return <CollectionGridMenu item={item} onClose={onClose} />;
  }
  return <TextColumnMenu item={item} onClose={onClose} />;
}

function TextColumnMenu({ item, onClose }: { item: NavigationItemDto; onClose: () => void }): ReactNode {
  const columns = item.columns.filter((column) => column.isVisible);
  return (
    <div className="min-w-0 overflow-y-auto px-14 py-24 xl:px-16">
      <div className="grid max-w-[980px] grid-cols-2 gap-x-16 gap-y-16 xl:grid-cols-4">
        {columns.map((column) => (
          <section key={objectId(column) || column.title} className="min-w-0">
            <h2 className="font-accent text-[12px] uppercase tracking-[0.22em] text-accent-gold">{column.title}</h2>
            <div className="mt-7 grid gap-5">
              {column.links.filter((link) => link.isVisible).map((link) => (
                <Link
                  key={objectId(link) || link.href}
                  href={link.href}
                  onClick={onClose}
                  className={(link.isHighlighted ? 'text-text-primary' : 'text-text-secondary') + ' group inline-flex min-h-8 items-center gap-5 text-[16px] font-light transition hover:text-text-primary'}
                >
                  <span>{link.label}</span>
                  {link.showArrow || link.label.toLowerCase().startsWith('view all') ? <ArrowRight size={17} strokeWidth={1.25} className="transition group-hover:translate-x-1" /> : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CollectionGridMenu({ item, onClose }: { item: NavigationItemDto; onClose: () => void }): ReactNode {
  const cards = (item.collectionCards ?? []).filter((card) => card.isVisible).slice(0, 6);
  return (
    <div className="min-w-0 overflow-y-auto px-14 py-20 xl:px-16">
      <h2 className="font-accent text-[12px] uppercase tracking-[0.22em] text-accent-gold">Collections</h2>
      <div className="mt-8 grid max-w-[980px] grid-cols-3 gap-3">
        {cards.map((card) => (
          <Link key={objectId(card) || cardHref(card)} href={cardHref(card)} onClick={onClose} className="group relative aspect-[16/10] overflow-hidden rounded-[6px] bg-background-elevated">
            <Image src={cardImage(card)} alt={cardTitle(card)} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:brightness-110" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-black/10" />
            <span className="absolute bottom-5 left-5 right-14 font-display text-[20px] font-light text-text-primary">{cardTitle(card)}</span>
            <ArrowRight size={22} strokeWidth={1.25} className="absolute bottom-5 right-5 text-text-primary transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
      <Link href={item.href || '/collections'} onClick={onClose} className="mt-12 inline-flex h-11 items-center gap-5 font-accent text-[11px] uppercase tracking-[0.2em] text-accent-gold transition hover:text-text-primary">
        <span>View All {item.label}</span>
        <ArrowRight size={18} strokeWidth={1.25} />
      </Link>
    </div>
  );
}

function MenuPromoPanel({ promo, fallbackTitle, onClose }: { promo?: MegaMenuPromoDto | null; fallbackTitle: string; onClose: () => void }): ReactNode {
  if (promo && promo.isVisible === false) return <aside className="border-l border-white/12" aria-hidden="true" />;
  const visible = promo?.showOnDesktop ?? true;
  if (!visible) return <aside className="border-l border-white/12" aria-hidden="true" />;
  const opacity = promo?.overlayOpacity ?? 0.5;
  const href = promo?.buttonHref || '/collections';
  return (
    <aside className="relative overflow-hidden border-l border-white/12">
      <Image src={promoImage(promo)} alt={promo?.title || fallbackTitle} fill sizes="392px" className="object-cover grayscale" priority />
      <span className="absolute inset-0 bg-black" style={{ opacity }} />
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
      <div className="relative flex h-full flex-col justify-end px-9 pb-14">
        <p className="font-accent text-[11px] uppercase tracking-[0.22em] text-accent-gold">{promo?.eyebrow || 'Featured'}</p>
        <h2 className="mt-5 font-display text-[42px] font-light leading-tight text-text-primary">{promo?.title || fallbackTitle}</h2>
        {promo?.subtitle ? <p className="mt-4 max-w-[260px] text-[15px] leading-7 text-text-secondary">{promo.subtitle}</p> : null}
        {(promo?.buttonLabel || href) ? (
          <Link href={href} onClick={onClose} className="mt-9 inline-flex h-12 w-full max-w-[260px] items-center justify-between border border-white/30 px-5 font-accent text-[11px] uppercase tracking-[0.16em] text-text-primary transition hover:border-accent-gold hover:text-accent-gold">
            <span>{promo?.buttonLabel || 'Explore'}</span>
            <ArrowRight size={18} strokeWidth={1.25} />
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
