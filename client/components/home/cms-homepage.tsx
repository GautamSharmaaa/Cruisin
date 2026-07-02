// Governed by .rules v1.0
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/utils';
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
const isPlayableVideo = (url: string): boolean => url.length > 0 && url !== '/hero.mp4';

const mediaFor = (section: CmsSectionDto, content: Content): string => asString(content, 'desktopMedia', section.image ?? asString(content, 'posterImage', asString(content, 'imageOne')));
const mobileMediaFor = (section: CmsSectionDto, content: Content): string => asString(content, 'mobileMedia', section.mobileImage ?? asString(content, 'mobileFallbackImage', mediaFor(section, content)));

export function CmsHomepage({ sections }: CmsHomepageProps): ReactNode {
  const visible = sections.filter((section) => active(section) && section.status === 'published');
  return <>{visible.map((section) => <CmsSectionRenderer key={sectionKey(section)} section={section} />)}</>;
}

function CmsSectionRenderer({ section }: { section: CmsSectionDto }): ReactNode {
  const content = section.content ?? {};
  const type = section.type ?? 'hero_campaign';
  const visibility = [section.hideOnDesktop ? 'lg:hidden' : '', section.hideOnMobile ? 'hidden lg:block' : ''].filter(Boolean).join(' ');
  if (type === 'announcement_bar') return <div className={visibility + ' border-b border-border px-5 py-3 text-center text-xs uppercase tracking-[0.14em] text-text-primary'} style={{ backgroundColor: asString(content, 'backgroundColor', '#0f0f0f') }}><Link href={asString(content, 'link', '/shop')}>{asString(content, 'text', section.title)}</Link></div>;
  if (type === 'marquee_strip') return <section className={visibility + ' overflow-hidden border-y border-border bg-background-elevated py-4'}><div className="flex min-w-max animate-pulse-line gap-8 whitespace-nowrap px-6 font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{Array.from({ length: 6 }).map((_, index) => <span key={index}>{asString(content, 'text', section.title)}</span>)}</div></section>;
  if (type === 'discount_banner') return <section className={visibility + ' border-y border-border bg-background-elevated px-6 py-14 text-center lg:px-20'}><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'couponCode')}</p><h2 className="mt-4 font-display text-4xl text-text-primary">{asString(content, 'discountTitle', section.title)}</h2><Link className="mt-7 inline-flex h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={asString(content, 'ctaLink', '/shop')}>{asString(content, 'ctaText', 'Shop now')}</Link></section>;
  if (type === 'limited_drop_timer') return <section className={visibility + ' border-y border-border bg-background-elevated px-6 py-14 text-center lg:px-20'}><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'label', 'Limited Drop')}</p><h2 className="mt-4 font-display text-4xl text-text-primary">{section.title}</h2><p className="mx-auto mt-4 max-w-xl text-text-secondary">{section.subtitle}</p><div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-2 font-mono text-2xl text-text-primary"><span className="border border-border p-4">02</span><span className="border border-border p-4">14</span><span className="border border-border p-4">39</span></div><Link className="mt-7 inline-flex h-11 items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={asString(content, 'ctaLink', '/drops')}>{asString(content, 'ctaText', 'Shop the drop')}</Link></section>;
  if (type === 'newsletter') return <section className={visibility + ' px-6 py-20 text-center lg:px-20'}><h2 className="font-display text-4xl text-text-primary">{section.title}</h2><p className="mx-auto mt-4 max-w-xl text-text-secondary">{asString(content, 'offerText', section.subtitle ?? '')}</p><form className="mx-auto mt-8 flex max-w-md border border-border"><input className="min-w-0 flex-1 bg-background-input px-4 text-sm text-text-primary" placeholder="Email address" /><button className="bg-accent-gold px-5 text-xs uppercase tracking-[0.08em] text-text-inverse" type="button">Subscribe</button></form><p className="mt-4 text-xs text-text-muted">{asString(content, 'privacyNote')}</p></section>;
  if (type === 'product_carousel' || type === 'trending_now' || type === 'hot_drop' || type === 'featured_collection' || type === 'recently_viewed' || type === 'best_sellers') return <ProductRail section={section} content={content} className={visibility} />;
  if (type === 'shop_the_look') return <ShopTheLook section={section} content={content} className={visibility} />;
  if (type === 'category_editorial_grid') return <CategoryGrid section={section} content={content} className={visibility} />;
  if (type === 'image_carousel') return <ImageCarousel section={section} content={content} className={visibility} />;
  if (type === 'video_landing') return <VideoLanding section={section} content={content} className={visibility} />;
  if (type === 'lookbook_story' || type === 'brand_story') return <EditorialStory section={section} content={content} className={visibility} />;
  if (type === 'fullscreen_collection_landing') return <FullscreenCollection section={section} content={content} className={visibility} />;
  if (type === 'social_proof') return <section className={visibility + ' px-6 py-20 lg:px-20'}><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'pressLogos', 'Press')}</p><blockquote className="mt-5 max-w-4xl font-display text-4xl leading-tight text-text-primary">{asString(content, 'quote', section.title)}</blockquote></section>;
  if (type === 'popup_campaign') return null;
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
      <Link className="mt-8 inline-flex h-12 w-fit items-center bg-accent-gold px-7 text-xs uppercase tracking-[0.08em] text-text-inverse" href={asString(content, 'ctaLink', section.cta?.link ?? '/shop')}>{asString(content, 'ctaText', section.cta?.text ?? 'Shop now')}</Link>
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
    <div className="relative flex min-h-dvh flex-col justify-end px-6 pb-24 lg:px-20"><h2 className="font-display text-hero font-light">{section.title}</h2><p className="mt-5 max-w-xl text-text-secondary">{section.subtitle}</p><Link className="mt-8 inline-flex h-12 w-fit items-center border border-border px-7 text-xs uppercase tracking-[0.08em]" href={asString(content, 'ctaLink', '/shop')}>{asString(content, 'ctaText', 'Shop now')}</Link></div>
  </section>;
}

function ImageCarousel({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const slides = rows(asString(content, 'slides')).slice(0, 3);
  return <section className={className + ' grid gap-px md:grid-cols-3'}>{slides.map((slide) => { const [title, image, href] = slide.split('|'); return <Link key={slide} href={href ?? '/shop'} className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><img src={image} alt="" className="h-full w-full object-cover opacity-80 transition duration-700 hover:scale-[1.05]" /><div className="absolute inset-x-0 bottom-0 bg-hero p-6"><p className="font-display text-3xl">{title || section.title}</p></div></Link>; })}</section>;
}

function CategoryGrid({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const tiles = rows(asString(content, 'tiles')).slice(0, 4);
  return <section className={className + ' px-6 py-20 lg:px-20'}><h2 className="mb-10 font-display text-4xl">{section.title}</h2><div className="grid gap-px md:grid-cols-4">{tiles.map((tile) => { const [label, image, href] = tile.split('|'); return <Link key={tile} href={href ?? '/shop'} className="relative aspect-[3/4] overflow-hidden bg-background-elevated"><img src={image} alt="" className="h-full w-full object-cover opacity-80" /><p className="absolute bottom-5 left-5 font-display text-2xl">{label}</p></Link>; })}</div></section>;
}

function ProductRail({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const products = ((section.products ?? []) as unknown[]).filter((product): product is Product => typeof product === 'object' && product !== null && 'slug' in product && 'title' in product);
  return <section className={className + ' px-6 py-20 lg:px-20'}>{section.type === 'featured_collection' && asString(content, 'image') ? <div className="relative mb-10 min-h-[360px] overflow-hidden bg-background-elevated"><img src={asString(content, 'image')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-hero" /><div className="relative flex min-h-[360px] flex-col justify-end p-8"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'collectionLabel', 'Featured Collection')}</p><h2 className="mt-3 font-display text-5xl">{section.title}</h2><Link className="mt-6 inline-flex h-11 w-fit items-center bg-accent-gold px-6 text-xs uppercase tracking-[0.08em] text-text-inverse" href={asString(content, 'ctaLink', '/shop')}>{asString(content, 'ctaText', 'Shop collection')}</Link></div></div> : null}<p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{asString(content, 'source', section.type ?? 'products')}</p><h2 className="mt-3 font-display text-4xl">{section.title}</h2>{section.type === 'hot_drop' ? <p className="mt-3 font-mono text-text-secondary">Launches {asString(content, 'launchDate')}</p> : null}<div className="mt-10 grid grid-cols-2 gap-px lg:grid-cols-4">{products.length ? products.slice(0, asNumber(content, 'limit', 8)).map((product, index) => <Link key={product.id} href={'/shop/' + product.slug} className="border border-border-subtle bg-background-primary"><div className="aspect-[3/4] bg-background-elevated">{product.images?.[0] ? <img src={product.images[0].url} alt={product.images[0].alt} className="h-full w-full object-cover" /> : null}</div><div className="p-4">{section.type === 'best_sellers' ? <p className="mb-2 font-mono text-xs text-accent-gold">#{index + 1}</p> : null}<p className="text-sm text-text-primary">{product.title}</p><p className="mt-2 font-mono text-sm text-accent-gold">{formatPrice(product.basePrice)}</p></div></Link>) : Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] border border-border-subtle bg-background-elevated" />)}</div></section>;
}

function ShopTheLook({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const image = asString(content, 'image', asString(content, 'imageOne'));
  const hotspots = rows(asString(content, 'hotspotLabels')).slice(0, 5);
  return <section className={className + ' grid gap-px bg-border md:grid-cols-[1.2fr_0.8fr]'}><div className="relative min-h-[620px] bg-background-elevated">{image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}{hotspots.map((hotspot, index) => { const [label, x = '50', y = '50'] = hotspot.split('|'); return <span key={hotspot} className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-background-primary bg-accent-gold text-xs text-text-inverse" style={{ left: x + '%', top: y + '%' }} aria-label={label}>{index + 1}</span>; })}</div><div className="bg-background-primary p-8 lg:p-16"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">Shop The Look</p><h2 className="mt-5 font-display text-5xl">{section.title}</h2><p className="mt-5 text-text-secondary">{section.subtitle}</p><Link className="mt-8 inline-flex h-12 items-center border border-border px-7 text-xs uppercase tracking-[0.08em]" href="/shop">Explore Products</Link></div></section>;
}

function EditorialStory({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  return <section className={className + ' grid gap-px bg-border md:grid-cols-2'}><div className="bg-background-primary p-6 lg:p-20"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{section.type === 'brand_story' ? 'Brand Story' : 'Lookbook'}</p><h2 className="mt-5 font-display text-5xl">{section.title}</h2><p className="mt-6 max-w-xl text-text-secondary">{asString(content, 'founderNote', section.description ?? section.subtitle ?? '')}</p><Link className="mt-8 inline-flex h-12 items-center border border-border px-7 text-xs uppercase tracking-[0.08em]" href={asString(content, 'ctaLink', '/shop')}>{asString(content, 'ctaText', 'Explore')}</Link></div><div className="grid grid-cols-2 gap-px bg-border"><img src={asString(content, 'craftsmanshipImage', asString(content, 'imageOne'))} alt="" className="h-full min-h-[520px] w-full object-cover" /><img src={asString(content, 'imageTwo', asString(content, 'craftsmanshipImage'))} alt="" className="h-full min-h-[520px] w-full object-cover" /></div></section>;
}

function FullscreenCollection({ section, content, className }: { section: CmsSectionDto; content: Content; className: string; }): ReactNode {
  const scenes = rows(asString(content, 'scenes')).slice(0, 4);
  return <>{scenes.map((scene) => { const [title, image, copy] = scene.split('|'); return <section key={scene} className={className + ' relative min-h-dvh overflow-hidden'}><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /><div className="absolute inset-0 bg-hero" /><div className="relative flex min-h-dvh flex-col justify-end px-6 pb-20 lg:px-20"><p className="font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{section.title}</p><h2 className="mt-4 font-display text-6xl">{title}</h2><p className="mt-4 text-text-secondary">{copy}</p></div></section>; })}</>;
}
