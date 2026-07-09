'use client';
// Governed by .rules v1.0
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { formatPrice } from '@/lib/utils';
import { api } from '@/lib/api';
import { filterCustomerVisibleProducts } from '@/lib/customer-state';
import type { CmsSectionDto } from '@/types/dto.types';
import type { Product } from '@/types/product.types';

export interface CmsHomepageProps {
  sections: CmsSectionDto[];
}

type Content = Record<string, unknown>;

const asString = (content: Content, key: string, fallback = ''): string => typeof content[key] === 'string' ? content[key] as string : fallback;
const asNumber = (content: Content, key: string, fallback: number): number => typeof content[key] === 'number' ? content[key] as number : Number(content[key] ?? fallback);
const asBool = (content: Content, key: string, fallback = false): boolean => typeof content[key] === 'boolean' ? content[key] as boolean : fallback;
const rows = (value: string): string[] => value.split('\n').map((item) => item.trim()).filter(Boolean);
const active = (section: CmsSectionDto): boolean => section.active ?? section.isActive ?? false;
const sectionKey = (section: CmsSectionDto): string => section.id ?? section._id ?? section.title;
const productKey = (product: Product): string => product.id ?? (product as Product & { _id?: string })._id ?? product.slug;
const isPlayableVideo = (url: string): boolean => url.length > 0 && url !== '/hero.mp4';
const recentlyViewedKey = 'cruisin_recently_viewed_products';
const displayLabel = (value: string): string => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const polishedCmsText = (value: string, fallback: string): string => /CMSHOME10|homepage merchandising section|QA|Browser Test|Placeholder|Sample Product/i.test(value) ? fallback : value;
const safeHref = (href: string, fallback = '/shop'): string => {
  const value = href.trim();
  if (!value) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return fallback;
};

const mediaFor = (section: CmsSectionDto, content: Content): string => asString(content, 'desktopMedia', section.image ?? asString(content, 'posterImage', asString(content, 'imageOne')));
const mobileMediaFor = (section: CmsSectionDto, content: Content): string => asString(content, 'mobileMedia', section.mobileImage ?? asString(content, 'mobileFallbackImage', mediaFor(section, content)));

export function CmsHomepage({ sections }: CmsHomepageProps): ReactNode {
  const seen = new Set<string>();
  const visible = sections.filter((section) => {
    if (!active(section) || section.status !== 'published') return false;
    if (/\bcopy$/i.test(section.title.trim())) return false;
    const key = [section.type, section.title.trim().toLowerCase(), section.sortOrder].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return <>{visible.map((section) => <CmsSectionRenderer key={sectionKey(section)} section={section} />)}</>;
}

function CmsSectionRenderer({ section }: { section: CmsSectionDto }): ReactNode {
  const content = section.content ?? {};
  const type = section.type ?? 'hero_campaign';
  const visibility = [section.hideOnDesktop ? 'lg:hidden' : '', section.hideOnMobile ? 'hidden lg:block' : ''].filter(Boolean).join(' ');
  if (type === 'announcement_bar') return <div className={visibility + ' border-b border-border px-5 py-3 text-center text-xs uppercase tracking-[0.14em] text-text-primary'} style={{ backgroundColor: asString(content, 'backgroundColor', '#0f0f0f') }}><Link href={safeHref(asString(content, 'link', '/shop'))}>{asString(content, 'text', section.title)}</Link></div>;
  if (type === 'marquee_strip') return <section className={visibility + ' overflow-hidden border-y border-border bg-background-elevated py-4'}><div className="flex w-full animate-pulse-line justify-center gap-8 overflow-hidden whitespace-nowrap px-4 font-accent text-xs uppercase tracking-[0.18em] text-accent-gold sm:px-6">{Array.from({ length: 6 }).map((_, index) => <span key={index} className="max-w-full shrink-0 truncate">{polishedCmsText(asString(content, 'text', section.title), 'New drop - limited stock - complimentary shipping above Rs. 999')}</span>)}</div></section>;
  if (type === 'discount_banner') return <section className={visibility + ' border-y border-border bg-background-elevated px-6 py-14 text-center lg:px-20'}><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'eyebrow', 'Private Access')}</p><h2 className="mt-4 font-display text-4xl text-text-primary">{asString(content, 'discountTitle', section.title)}</h2><Link className="mt-7 inline-flex h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={safeHref(asString(content, 'ctaLink', '/shop'))}>{asString(content, 'ctaText', 'Shop now')}</Link></section>;
  if (type === 'limited_drop_timer') return <CountdownSection section={section} content={content} className={visibility} />;
  if (type === 'newsletter') return <NewsletterSection section={section} content={content} className={visibility} source="homepage-newsletter" />;
  if (type === 'product_carousel' || type === 'trending_now' || type === 'hot_drop' || type === 'featured_collection' || type === 'recently_viewed' || type === 'best_sellers') return <ProductRail section={section} content={content} className={visibility} />;
  if (type === 'shop_the_look') return <ShopTheLook section={section} content={content} className={visibility} />;
  if (type === 'category_editorial_grid') return <CategoryGrid section={section} content={content} className={visibility} />;
  if (type === 'image_carousel') return <ImageCarousel section={section} content={content} className={visibility} />;
  if (type === 'video_landing') return <VideoLanding section={section} content={content} className={visibility} />;
  if (type === 'lookbook_story' || type === 'brand_story') return <EditorialStory section={section} content={content} className={visibility} />;
  if (type === 'fullscreen_collection_landing') return <FullscreenCollection section={section} content={content} className={visibility} />;
  if (type === 'social_proof') return <section className={visibility + ' px-6 py-20 lg:px-20'}><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'pressLogos', 'Press')}</p><blockquote className="mt-5 max-w-4xl font-display text-4xl leading-tight text-text-primary">{asString(content, 'quote', section.title)}</blockquote></section>;
  if (type === 'popup_campaign') return <PopupCampaign section={section} content={content} className={visibility} />;
  return <HeroCampaign section={section} content={content} className={visibility} />;
}

function HeroCampaign({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const overlay = asNumber(content, 'overlayOpacity', 44) / 100;
  return <section className={className + ' relative min-h-dvh overflow-hidden'}>
    <picture><source media="(max-width: 767px)" srcSet={mobileMediaFor(section, content)} /><img src={mediaFor(section, content)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /></picture>
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${overlay * 0.4}), rgba(0,0,0,${overlay + 0.12}))` }} />
    <div className="relative flex min-h-dvh flex-col justify-end px-6 pb-24 lg:px-20">
      <p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'campaignLabel', section.position ?? 'Campaign')}</p>
      <h1 className="mt-5 max-w-5xl font-display text-hero font-light text-text-primary">{section.title}</h1>
      <p className="mt-5 max-w-2xl text-base text-text-secondary">{section.subtitle}</p>
      <Link className="mt-8 inline-flex h-12 w-fit items-center bg-accent-gold px-7 text-xs uppercase tracking-[0.08em] text-text-inverse" href={safeHref(asString(content, 'ctaLink', section.cta?.link ?? '/shop'))}>{asString(content, 'ctaText', section.cta?.text ?? 'Shop now')}</Link>
    </div>
  </section>;
}

function VideoLanding({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const videoUrl = asString(content, 'videoUrl');
  const posterImage = asString(content, 'posterImage', asString(content, 'mobileFallbackImage'));
  return <section className={className + ' relative min-h-dvh overflow-hidden'}>
    {isPlayableVideo(videoUrl)
      ? <video src={videoUrl} poster={posterImage} autoPlay={asBool(content, 'autoplay', true)} muted={asBool(content, 'muted', true)} loop={asBool(content, 'loop', true)} playsInline className="absolute inset-0 h-full w-full object-cover opacity-75" />
      : <Image src={posterImage} alt="" fill sizes="100vw" className="object-cover opacity-75" priority />}
    <div className="absolute inset-0 bg-hero" />
    <div className="relative flex min-h-dvh flex-col justify-end px-6 pb-24 lg:px-20"><h2 className="font-display text-hero font-light">{section.title}</h2><p className="mt-5 max-w-xl text-text-secondary">{section.subtitle}</p><Link className="mt-8 inline-flex h-12 w-fit items-center border border-border px-7 text-xs uppercase tracking-[0.08em]" href={safeHref(asString(content, 'ctaLink', '/shop'))}>{asString(content, 'ctaText', 'Shop now')}</Link></div>
  </section>;
}

function ImageCarousel({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const slides = rows(asString(content, 'slides')).slice(0, 3);
  return <section className={className + ' grid gap-px md:grid-cols-3'}>{slides.map((slide) => { const [title, image, href] = slide.split('|'); return <Link key={slide} href={safeHref(href ?? '/shop')} className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><img src={image} alt={title || section.title} className="h-full w-full object-cover opacity-80 transition duration-700 hover:scale-[1.05]" /><div className="absolute inset-x-0 bottom-0 bg-hero p-6"><p className="font-display text-3xl">{title || section.title}</p></div></Link>; })}</section>;
}

function CategoryGrid({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const tiles = rows(asString(content, 'tiles')).slice(0, 4);
  return <section className={className + ' px-6 py-20 lg:px-20'}><h2 className="mb-10 font-display text-4xl">{section.title}</h2><div className="grid gap-px md:grid-cols-4">{tiles.map((tile) => { const [label, image, href] = tile.split('|'); return <Link key={tile} href={safeHref(href ?? '/shop')} className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><img src={image} alt={label || section.title} className="h-full w-full object-cover opacity-80" /><p className="absolute bottom-5 left-5 font-display text-2xl">{label}</p></Link>; })}</div></section>;
}

function ProductRail({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const referencedProducts = ((section.products ?? []) as unknown[]).filter((product): product is Product => typeof product === 'object' && product !== null && 'slug' in product && 'title' in product);
  const recentProducts = useRecentlyViewedProducts();
  const products = filterCustomerVisibleProducts(section.type === 'recently_viewed' && recentProducts.length > 0 ? recentProducts : referencedProducts);
  if (section.type === 'recently_viewed' && products.length === 0) return null;
  return <section className={className + ' px-6 py-20 lg:px-20'}>{section.type === 'featured_collection' && asString(content, 'image') ? <div className="relative mb-10 min-h-[360px] overflow-hidden bg-background-elevated"><img src={asString(content, 'image')} alt={asString(content, 'collectionLabel', section.title)} className="absolute inset-0 h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-hero" /><div className="relative flex min-h-[360px] flex-col justify-end p-8"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'collectionLabel', 'Featured Collection')}</p><h2 className="mt-3 font-display text-5xl">{section.title}</h2><Link className="mt-6 inline-flex h-11 w-fit items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={safeHref(asString(content, 'ctaLink', '/shop'))}>{asString(content, 'ctaText', 'Shop collection')}</Link></div></div> : null}<p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{displayLabel(asString(content, 'source', section.type ?? 'products'))}</p><h2 className="mt-3 font-display text-4xl">{section.title}</h2>{section.type === 'hot_drop' ? <p className="mt-3 font-mono text-text-secondary">Launches {asString(content, 'launchDate')}</p> : null}<div className="mt-10 grid grid-cols-2 gap-px lg:grid-cols-4">{products.length ? products.slice(0, asNumber(content, 'limit', 8)).map((product, index) => <Link key={productKey(product)} href={'/product/' + product.slug} className="border border-border-subtle bg-background-primary"><div className="aspect-[3/4] bg-background-elevated">{product.images?.[0] ? <img src={product.images[0].url} alt={product.images[0].alt} className="h-full w-full object-cover" /> : null}</div><div className="p-4">{section.type === 'best_sellers' ? <p className="mb-2 font-mono text-xs text-accent-gold">#{index + 1}</p> : null}<p className="text-sm text-text-primary">{product.title}</p><p className="mt-2 flex flex-wrap gap-2 font-mono text-sm text-accent-gold">{formatPrice(product.basePrice)}{product.comparePrice ? <span className="text-text-muted line-through">{formatPrice(product.comparePrice)}</span> : null}</p></div></Link>) : Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] border border-border-subtle bg-background-elevated" />)}</div></section>;
}

function ShopTheLook({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const image = asString(content, 'image', asString(content, 'imageOne'));
  const hotspots = rows(asString(content, 'hotspotLabels')).slice(0, 5);
  return <section className={className + ' grid gap-px bg-border md:grid-cols-[1.2fr_0.8fr]'}><div className="relative min-h-[620px] bg-background-elevated">{image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}{hotspots.map((hotspot, index) => { const [label, x = '50', y = '50'] = hotspot.split('|'); return <span key={hotspot} className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-background-primary bg-accent-gold text-xs text-text-inverse" style={{ left: x + '%', top: y + '%' }} aria-label={label}>{index + 1}</span>; })}</div><div className="bg-background-primary p-8 lg:p-16"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">Shop The Look</p><h2 className="mt-5 font-display text-5xl">{section.title}</h2><p className="mt-5 text-text-secondary">{section.subtitle}</p><Link className="mt-8 inline-flex h-12 items-center border border-border px-7 text-xs uppercase tracking-[0.08em]" href="/shop">Explore Products</Link></div></section>;
}

function PopupCampaign({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const image = asString(content, 'desktopImage', asString(content, 'mobileImage'));
  const key = 'cruisin_popup_closed_' + sectionKey(section);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.sessionStorage.getItem(key) !== '1');
  }, [key]);
  const close = (): void => {
    window.sessionStorage.setItem(key, '1');
    setOpen(false);
  };
  if (!open) return null;
  return <div className={className + ' fixed inset-0 flex items-start justify-center bg-black/70 px-4 pb-4 pt-24 backdrop-blur-sm sm:items-center sm:p-4'} style={{ zIndex: 120 }} role="dialog" aria-modal="true" aria-label={section.title}>
    <section className="relative grid max-h-[90vh] w-full max-w-4xl overflow-auto border border-border bg-background-elevated md:grid-cols-[0.9fr_1.1fr]">
      <button type="button" onClick={close} aria-label="Close popup" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center border border-border bg-background-primary text-text-primary" style={{ zIndex: 130 }}>×</button>
      {image ? <div className="relative min-h-[320px] bg-background-primary"><img src={image} alt={section.title} className="absolute inset-0 h-full w-full object-cover opacity-80" /></div> : null}
      <div className="p-6 text-center md:p-12 md:text-left">
        <p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'popupType', 'Campaign')}</p>
        <h2 className="mt-4 font-display text-4xl text-text-primary">{section.title}</h2>
        <p className="mt-4 max-w-xl text-text-secondary">{asString(content, 'offerText', section.subtitle ?? '')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
          <Link onClick={close} className="inline-flex h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={safeHref(asString(content, 'ctaLink', '/new-featured'))}>{asString(content, 'ctaText', 'Explore New Arrivals')}</Link>
          <NewsletterMiniForm source="popup-campaign" />
        </div>
      </div>
    </section>
  </div>;
}

function EditorialStory({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  return <section className={className + ' grid min-w-0 gap-px overflow-hidden bg-border md:grid-cols-2'}><div className="min-w-0 bg-background-primary p-6 lg:p-20"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{section.type === 'brand_story' ? 'Brand Story' : 'Lookbook'}</p><h2 className="mt-5 break-words font-display text-4xl sm:text-5xl">{section.title}</h2><p className="mt-6 max-w-xl text-text-secondary">{polishedCmsText(asString(content, 'founderNote', section.description ?? section.subtitle ?? ''), 'A quiet edit of layered silhouettes, technical texture, and everyday movement.')}</p><Link className="mt-8 inline-flex min-h-12 max-w-full items-center border border-border px-5 text-xs uppercase tracking-[0.08em] sm:px-7" href={asString(content, 'ctaLink', '/shop')}>{asString(content, 'ctaText', 'Explore')}</Link></div><div className="grid min-w-0 grid-cols-1 gap-px bg-border sm:grid-cols-2"><img src={asString(content, 'craftsmanshipImage', asString(content, 'imageOne'))} alt="" className="h-full min-h-[360px] w-full object-cover sm:min-h-[520px]" /><img src={asString(content, 'imageTwo', asString(content, 'craftsmanshipImage'))} alt="" className="h-full min-h-[360px] w-full object-cover sm:min-h-[520px]" /></div></section>;
}

function FullscreenCollection({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const scenes = rows(asString(content, 'scenes')).slice(0, 4);
  return <>{scenes.map((scene) => { const [title, image, copy] = scene.split('|'); return <section key={scene} className={className + ' relative min-h-dvh overflow-hidden'}><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /><div className="absolute inset-0 bg-hero" /><div className="relative flex min-h-dvh flex-col justify-end px-6 pb-20 lg:px-20"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{section.title}</p><h2 className="mt-4 font-display text-6xl">{title}</h2><p className="mt-4 text-text-secondary">{copy}</p></div></section>; })}</>;
}

function CountdownSection({ section, content, className }: { section: CmsSectionDto; content: Content; className: string }): ReactNode {
  const endDateTime = asString(content, 'endDateTime');
  const endMs = useMemo(() => Date.parse(endDateTime), [endDateTime]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const invalid = Number.isNaN(endMs);
  const ready = now !== null;
  const remaining = invalid || !ready ? 0 : Math.max(0, endMs - now);
  const expired = ready && !invalid && remaining <= 0;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units = invalid || !ready ? [['--', 'Days'], ['--', 'Hours'], ['--', 'Minutes'], ['--', 'Seconds']] : [[String(days).padStart(2, '0'), 'Days'], [String(hours).padStart(2, '0'), 'Hours'], [String(minutes).padStart(2, '0'), 'Minutes'], [String(seconds).padStart(2, '0'), 'Seconds']];
  return <section className={className + ' border-y border-border bg-background-elevated px-6 py-14 text-center lg:px-20'}>
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'label', 'Limited Drop')}</p>
    <h2 className="mt-4 font-display text-4xl text-text-primary">{section.title}</h2>
    <p className="mx-auto mt-4 max-w-xl text-text-secondary">{invalid ? 'Drop timing is being updated.' : expired ? 'This drop window has ended.' : section.subtitle}</p>
    <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-2 font-mono text-text-primary sm:grid-cols-4">{units.map(([value, label]) => <div key={label} className="border border-border p-4"><span className="block text-2xl">{value}</span><span className="mt-2 block text-[10px] uppercase tracking-[0.14em] text-text-muted">{label}</span></div>)}</div>
    <Link className="mt-7 inline-flex h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={safeHref(asString(content, 'ctaLink', '/drops'))}>{asString(content, 'ctaText', 'Shop the drop')}</Link>
  </section>;
}

function NewsletterSection({ section, content, className, source }: { section: CmsSectionDto; content: Content; className: string; source: string }): ReactNode {
  return <section className={className + ' px-6 py-20 text-center lg:px-20'}>
    <h2 className="font-display text-4xl text-text-primary">{section.title}</h2>
    <p className="mx-auto mt-4 max-w-xl text-text-secondary">{asString(content, 'offerText', section.subtitle ?? '')}</p>
    <div className="mx-auto mt-8 max-w-md"><NewsletterMiniForm source={source} buttonText={asString(content, 'buttonText', 'Subscribe')} /></div>
    <p className="mt-4 text-xs text-text-muted">{asString(content, 'privacyNote')}</p>
  </section>;
}

function NewsletterMiniForm({ source, buttonText = 'Join' }: { source: string; buttonText?: string }): ReactNode {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    try {
      const response = await api.post('/newsletter/subscribe', { email, source, consent: true });
      setStatus('success');
      setMessage(response.data.message ?? 'You are on the list.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Enter a valid email address.');
    }
  };
  return <div>
    <form onSubmit={submit} className="flex max-w-md border border-border">
      <input className="min-w-0 flex-1 bg-background-input px-4 text-sm text-text-primary" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required />
      <button className="bg-accent-gold px-5 text-xs uppercase tracking-[0.08em] text-text-inverse disabled:opacity-60" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Saving' : buttonText}</button>
    </form>
    {message ? <p className={status === 'error' ? 'mt-3 text-sm text-danger' : 'mt-3 text-sm text-success'} aria-live="polite">{message}</p> : null}
  </div>;
}

function useRecentlyViewedProducts(): Product[] {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(recentlyViewedKey);
      const parsed = raw ? JSON.parse(raw) as Product[] : [];
      const products = Array.isArray(parsed) ? filterCustomerVisibleProducts(parsed).slice(0, 8) : [];
      setProducts(products);
      if (products.length !== parsed.length) window.localStorage.setItem(recentlyViewedKey, JSON.stringify(products));
    } catch (_error: unknown) {
      setProducts([]);
    }
  }, []);
  return products;
}
