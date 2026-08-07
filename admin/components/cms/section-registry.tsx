// Governed by .rules v1.0
import { BadgePercent, Clock3, Flame, Grid2X2, Images, LayoutTemplate, Mail, Megaphone, MessageSquareQuote, MonitorPlay, Newspaper, PackageSearch, Play, Rows3, Shirt, ShoppingBag, Smartphone, Sparkles, Star, Timer, Trophy, Users } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import type { CmsSectionInput } from '@/hooks/useAdminMutations';
import type { CmsSectionDto, CmsSectionType } from '@/types/dto.types';

export type SectionCategory = 'Hero' | 'Products' | 'Marketing' | 'Editorial' | 'Social' | 'Utility';
export type ContentState = Record<string, string | number | boolean>;

export interface SectionTemplate {
  type: CmsSectionType;
  name: string;
  category: SectionCategory;
  description: string;
  bestFor: string;
  tags: string[];
  badge?: 'Recommended' | 'Most Used' | 'New';
  icon: ComponentType<{ size?: number; className?: string }>;
  miniPreview: ComponentType;
  fullPreview: ComponentType;
  defaults: ContentState;
  requiredFields: string[];
  editableFields: string[];
}

export interface HomepageTemplate {
  id: string;
  name: string;
  label?: string;
  description: string;
  bestFor: string;
  tags: string[];
  isDefault?: boolean;
  isSystemTemplate?: boolean;
  sections: CmsSectionInput[];
}

const today = (): string => new Date().toISOString().slice(0, 10);
const futureDate = (days: number): string => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };

const baseInput = (type: CmsSectionType, title: string, subtitle: string, content: ContentState, sortOrder = 0): CmsSectionInput => ({
  pageTarget: 'home',
  type,
  title,
  subtitle,
  description: getSectionTemplate(type).description,
  content,
  styles: {},
  products: [],
  categories: [],
  sortOrder,
  active: true,
  hideOnDesktop: type === 'mobile_media_landing',
  hideOnMobile: false,
  status: 'draft',
  startDate: today(),
  endDate: futureDate(45)
});

function PreviewFrame({ children, tall = false }: { children: ReactNode; tall?: boolean }): ReactNode {
  return <div className={tall ? 'h-48 overflow-hidden bg-[#080808]' : 'h-28 overflow-hidden bg-[#080808]'}>{children}</div>;
}

const ProductTile = ({ rank }: { rank?: number }): ReactNode => <div className="min-w-0 border border-white/10 bg-white/[0.06] p-2"><div className="aspect-[3/4] bg-gradient-to-br from-white/20 to-white/5" />{rank ? <p className="mt-1 font-mono text-[9px] text-accent-gold">#{rank}</p> : null}<div className="mt-2 h-1.5 w-10 bg-white/30" /><div className="mt-1.5 h-1.5 w-7 bg-accent-gold/60" /></div>;

export function MiniAnnouncementPreview(): ReactNode { return <PreviewFrame><div className="flex h-full items-center justify-center border-b border-accent-gold/30 bg-[#111] px-3 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-accent-gold">Free shipping on orders above Rs. 999</div></PreviewFrame>; }
export function MiniHeroCampaignPreview(): ReactNode { return <PreviewFrame><div className="relative flex h-full flex-col justify-end bg-gradient-to-br from-[#2a251f] via-[#111] to-black p-4"><p className="text-[8px] uppercase tracking-[0.18em] text-accent-gold">NEW SEASON</p><h4 className="mt-1 font-display text-xl leading-none text-white">Luxury Streetwear Essentials</h4><span className="mt-2 w-fit bg-accent-gold px-2 py-1 text-[8px] uppercase text-black">Shop Now</span></div></PreviewFrame>; }
export function MiniVideoLandingPreview(): ReactNode { return <PreviewFrame><div className="flex h-full items-center justify-center bg-gradient-to-br from-black via-[#1c1c1c] to-[#3a2a1a]"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-gold text-accent-gold"><Play size={16} fill="currentColor" /></span></div></PreviewFrame>; }
export function MiniMobileMediaLandingPreview(): ReactNode { return <PreviewFrame><div className="flex h-full items-center justify-center bg-gradient-to-br from-[#18130f] via-[#090909] to-black"><div className="relative h-24 w-14 overflow-hidden border border-accent-gold/50 bg-white/10"><span className="absolute inset-x-1 bottom-2 py-1 text-center text-[6px] uppercase tracking-[0.16em] text-[#f0d9ae] drop-shadow-[0_0_5px_rgba(200,169,126,0.7)]">Shop now</span></div></div></PreviewFrame>; }
export function MiniImageCarouselPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-3 gap-px bg-black">{[0, 1, 2].map((item) => <div key={item} className="bg-gradient-to-br from-white/20 to-white/5" />)}<div className="absolute" /></div></PreviewFrame>; }
export function MiniProductCarouselPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-3 gap-2 p-3">{[0, 1, 2].map((item) => <ProductTile key={item} />)}</div></PreviewFrame>; }
export function MiniHotDropPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-[1fr_1.2fr] gap-3 p-3"><ProductTile /><div className="flex flex-col justify-center"><span className="w-fit border border-accent-gold px-2 py-1 text-[8px] uppercase text-accent-gold">Limited Drop</span><div className="mt-3 h-2 w-20 bg-white/30" /><div className="mt-2 h-2 w-12 bg-accent-gold/70" /></div></div></PreviewFrame>; }
export function MiniTrendingNowPreview(): ReactNode { return <PreviewFrame><div className="p-3"><span className="bg-accent-gold px-2 py-1 text-[8px] uppercase text-black">Trending</span><div className="mt-3 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <div key={item} className="aspect-square bg-white/10" />)}</div></div></PreviewFrame>; }
export function MiniDiscountBannerPreview(): ReactNode { return <PreviewFrame><div className="flex h-full flex-col items-center justify-center border-y border-accent-gold/30 bg-[#120f0c] text-center"><p className="text-[9px] uppercase tracking-[0.16em] text-accent-gold">LUXE10</p><h4 className="mt-2 font-display text-2xl">Private Offer</h4><span className="mt-2 border border-white/20 px-3 py-1 text-[8px] uppercase">Shop Sale</span></div></PreviewFrame>; }
export function MiniCategoryGridPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-2 grid-rows-2 gap-px bg-black">{['Men', 'Women', 'Drops', 'Edit'].map((item) => <div key={item} className="flex items-end bg-white/10 p-2 font-display text-sm">{item}</div>)}</div></PreviewFrame>; }
export function MiniLookbookPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-[1.2fr_1fr]"><div className="bg-gradient-to-br from-white/20 to-white/5" /><div className="p-3"><p className="text-[8px] uppercase text-accent-gold">Editorial</p><div className="mt-3 h-2 w-16 bg-white/40" /><div className="mt-2 h-1.5 w-20 bg-white/20" /><div className="mt-1 h-1.5 w-14 bg-white/20" /></div></div></PreviewFrame>; }
export function MiniBrandStoryPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-[1.4fr_1fr] gap-3 p-3"><div><p className="text-[8px] uppercase text-accent-gold">Brand Story</p><div className="mt-3 h-2 w-20 bg-white/40" /><div className="mt-2 h-1.5 w-full bg-white/20" /><div className="mt-1 h-1.5 w-3/4 bg-white/20" /></div><div className="bg-white/10" /></div></PreviewFrame>; }
export function MiniFullscreenCollectionPreview(): ReactNode { return <PreviewFrame><div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-white/10 to-black text-center"><p className="text-[8px] uppercase text-accent-gold">Collection</p><h4 className="mt-2 font-display text-2xl">Midnight Transit</h4></div></PreviewFrame>; }
export function MiniPopupCampaignPreview(): ReactNode { return <PreviewFrame><div className="flex h-full items-center justify-center bg-black/80"><div className="w-36 border border-accent-gold/40 bg-[#111] p-3 text-center"><h4 className="font-display text-lg">Private List</h4><div className="mt-3 h-5 border border-white/20" /><div className="mt-2 h-5 bg-accent-gold" /></div></div></PreviewFrame>; }
export function MiniNewsletterPreview(): ReactNode { return <PreviewFrame><div className="flex h-full flex-col items-center justify-center p-4 text-center"><h4 className="font-display text-2xl">Join The List</h4><div className="mt-3 flex w-full max-w-44 border border-white/20"><span className="h-6 flex-1" /><span className="w-14 bg-accent-gold" /></div></div></PreviewFrame>; }
export function MiniSocialProofPreview(): ReactNode { return <PreviewFrame><div className="flex h-full flex-col justify-center p-4"><p className="text-accent-gold">★★★★★</p><blockquote className="mt-2 font-display text-xl leading-tight">"Premium everyday presence."</blockquote><div className="mt-3 h-2 w-20 bg-white/20" /></div></PreviewFrame>; }
export function MiniMarqueePreview(): ReactNode { return <PreviewFrame><div className="flex h-full items-center overflow-hidden border-y border-accent-gold/25"><div className="min-w-max font-mono text-[10px] uppercase tracking-[0.18em] text-accent-gold">NEW DROP - LIMITED STOCK - LUXURY STREETWEAR - NEW DROP</div></div></PreviewFrame>; }
export function MiniShopTheLookPreview(): ReactNode { return <PreviewFrame><div className="relative h-full bg-gradient-to-br from-white/20 to-white/5"><span className="absolute left-1/2 top-1/3 h-3 w-3 rounded-full border-2 border-black bg-accent-gold" /><span className="absolute bottom-6 left-8 h-3 w-3 rounded-full border-2 border-black bg-accent-gold" /></div></PreviewFrame>; }
export function MiniFeaturedCollectionPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-rows-[1fr_auto]"><div className="flex items-end bg-white/10 p-3 font-display text-xl">Featured Collection</div><div className="grid grid-cols-3 gap-px">{[0, 1, 2].map((item) => <div key={item} className="h-7 bg-white/15" />)}</div></div></PreviewFrame>; }
export function MiniLimitedDropTimerPreview(): ReactNode { return <PreviewFrame><div className="flex h-full flex-col items-center justify-center text-center"><p className="text-[9px] uppercase text-accent-gold">Drop Ends Soon</p><div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm"><span className="border border-white/15 p-2">02</span><span className="border border-white/15 p-2">14</span><span className="border border-white/15 p-2">39</span></div></div></PreviewFrame>; }
export function MiniRecentlyViewedPreview(): ReactNode { return <MiniProductCarouselPreview />; }
export function MiniBestSellersPreview(): ReactNode { return <PreviewFrame><div className="grid h-full grid-cols-3 gap-2 p-3">{[1, 2, 3].map((item) => <ProductTile key={item} rank={item} />)}</div></PreviewFrame>; }

function FullPreview({ mini: Mini, name }: { mini: ComponentType; name: string }): ReactNode {
  return <div className="border border-border-subtle bg-background-primary p-3"><div className="origin-top scale-100"><PreviewFrame tall><Mini /></PreviewFrame></div><p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-secondary">{name} example</p></div>;
}

const full = (Mini: ComponentType, name: string): ComponentType => function RegistryFullPreview() { return <FullPreview mini={Mini} name={name} />; };

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { type: 'announcement_bar', name: 'Announcement Bar', category: 'Utility', description: 'Slim luxury announcement strip for shipping, sale, or launch notices.', bestFor: 'Promos and service messages', tags: ['announcement', 'sale', 'shipping', 'utility', 'recommended'], badge: 'Most Used', icon: Megaphone, miniPreview: MiniAnnouncementPreview, fullPreview: full(MiniAnnouncementPreview, 'Announcement Bar'), defaults: { text: 'Free shipping on orders above Rs. 999', link: '/shop', backgroundColor: '#0f0f0f', autoHide: false }, requiredFields: ['content.text'], editableFields: ['Text', 'Link', 'Background color', 'Auto hide'] },
  { type: 'hero_campaign', name: 'Hero Campaign', category: 'Hero', description: 'Full-width campaign banner with media, headline, and CTA.', bestFor: 'New drops and collection launches', tags: ['hero', 'campaign', 'launch', 'banner', 'recommended'], badge: 'Recommended', icon: Sparkles, miniPreview: MiniHeroCampaignPreview, fullPreview: full(MiniHeroCampaignPreview, 'Hero Campaign'), defaults: { campaignLabel: 'NEW SEASON', desktopMedia: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=85', mobileMedia: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85', ctaText: 'Shop Now', ctaLink: '/collections/new-arrivals', textPlacement: 'center', overlayOpacity: 40 }, requiredFields: ['title', 'content.ctaLink'], editableFields: ['Eyebrow', 'Heading', 'Subheading', 'Primary CTA label', 'Primary CTA link', 'Desktop media', 'Mobile media', 'Overlay opacity', 'Text alignment', 'Height'] },
  { type: 'video_landing', name: 'Single Video Landing', category: 'Hero', description: 'Immersive video-first landing block with poster fallback and CTA.', bestFor: 'Campaign films and brand moments', tags: ['video', 'hero', 'landing', 'campaign'], icon: MonitorPlay, miniPreview: MiniVideoLandingPreview, fullPreview: full(MiniVideoLandingPreview, 'Single Video Landing'), defaults: { videoUrl: '', posterImage: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85', autoplay: true, muted: true, loop: true, ctaText: 'Shop The Film', ctaLink: '/shop', mobileFallbackImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' }, requiredFields: ['content.posterImage'], editableFields: ['Video URL', 'Poster image', 'Autoplay', 'Muted', 'Loop', 'CTA label', 'CTA link'] },
  { type: 'mobile_media_landing', name: 'Mobile Media Landing', category: 'Hero', description: 'Mobile-only full-screen image or video with an optional editable call to action.', bestFor: 'A dedicated mobile campaign visual', tags: ['mobile', 'image', 'video', 'hero', 'landing'], badge: 'New', icon: Smartphone, miniPreview: MiniMobileMediaLandingPreview, fullPreview: full(MiniMobileMediaLandingPreview, 'Mobile Media Landing'), defaults: { mediaType: 'image', imageUrl: '', videoUrl: '', posterImage: '', altText: '', autoplay: true, muted: true, loop: true, overlayOpacity: 20, ctaText: 'Shop Now', ctaLink: '/shop' }, requiredFields: [], editableFields: ['Media type', 'Image URL', 'Video URL', 'Poster image', 'Alt text', 'Autoplay', 'Muted', 'Loop', 'Overlay opacity', 'CTA label', 'CTA link'] },
  { type: 'image_carousel', name: 'Image Carousel', category: 'Hero', description: 'Editorial image slides for campaigns, collections, and seasonal stories.', bestFor: 'Visual campaigns with multiple scenes', tags: ['image', 'carousel', 'slides', 'hero'], icon: Images, miniPreview: MiniImageCarouselPreview, fullPreview: full(MiniImageCarouselPreview, 'Image Carousel'), defaults: { slides: 'Campaign One|https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85|/shop\nCampaign Two|https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=85|/collections', autoSlideSpeed: 5, manualArrows: true, dotIndicators: true }, requiredFields: ['content.slides'], editableFields: ['Slides', 'Auto slide speed', 'Manual arrows', 'Dot indicators'] },
  { type: 'product_carousel', name: 'Product Carousel', category: 'Products', description: 'Horizontal product discovery rail for drops, edits, and collections.', bestFor: 'New arrivals and product discovery', tags: ['product', 'carousel', 'new arrivals', 'most used'], badge: 'Most Used', icon: ShoppingBag, miniPreview: MiniProductCarouselPreview, fullPreview: full(MiniProductCarouselPreview, 'Product Carousel'), defaults: { source: 'new-arrivals', productIds: '', limit: 8, cardStyle: 'editorial' }, requiredFields: ['title'], editableFields: ['Source', 'Manual product IDs', 'Limit', 'Card style'] },
  { type: 'hot_drop', name: 'Hot Drop', category: 'Products', description: 'Focused product drop module with launch date and urgency controls.', bestFor: 'Limited products and hype releases', tags: ['product', 'drop', 'limited', 'launch'], icon: Flame, miniPreview: MiniHotDropPreview, fullPreview: full(MiniHotDropPreview, 'Hot Drop'), defaults: { dropName: 'Black Transit', launchDate: futureDate(7), productIds: '', notifyText: 'Notify Me', soldOut: false }, requiredFields: ['content.dropName'], editableFields: ['Drop name', 'Launch date', 'Product IDs', 'Notify text', 'Sold out'] },
  { type: 'trending_now', name: 'Trending Now', category: 'Products', description: 'Trending product grid driven by popularity or manual curation.', bestFor: 'Demand signals and social proof', tags: ['product', 'trending', 'popular'], icon: Flame, miniPreview: MiniTrendingNowPreview, fullPreview: full(MiniTrendingNowPreview, 'Trending Now'), defaults: { source: 'views-orders', manualOverride: false, productIds: '', limit: 8, cardStyle: 'minimal' }, requiredFields: ['title'], editableFields: ['Source', 'Manual override', 'Product IDs', 'Limit', 'Card style'] },
  { type: 'discount_banner', name: 'Discount Banner', category: 'Marketing', description: 'Bold campaign banner for offers, coupon codes, and private windows.', bestFor: 'Sale and coupon campaigns', tags: ['sale', 'discount', 'coupon', 'marketing'], icon: BadgePercent, miniPreview: MiniDiscountBannerPreview, fullPreview: full(MiniDiscountBannerPreview, 'Discount Banner'), defaults: { discountTitle: 'Private Offer', couponCode: 'LUXE10', ctaText: 'Shop Sale', ctaLink: '/shop' }, requiredFields: ['content.couponCode'], editableFields: ['Title', 'Coupon code', 'CTA label', 'CTA link'] },
  { type: 'category_editorial_grid', name: 'Category Editorial Grid', category: 'Editorial', description: 'Visual 2x2 category grid for merchandising core storefront paths.', bestFor: 'Category exploration', tags: ['category', 'grid', 'editorial', 'collections'], icon: Grid2X2, miniPreview: MiniCategoryGridPreview, fullPreview: full(MiniCategoryGridPreview, 'Category Editorial Grid'), defaults: { tiles: 'Men|https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&w=1000&q=85|/shop?category=men\nWomen|https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1000&q=85|/shop?category=women\nAccessories|https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1000&q=85|/shop?category=accessories\nDrops|https://images.unsplash.com/photo-1506629905607-d9b297d84219?auto=format&fit=crop&w=1000&q=85|/drops' }, requiredFields: ['content.tiles'], editableFields: ['Tiles', 'Category labels', 'Image URLs', 'Links'] },
  { type: 'lookbook_story', name: 'Lookbook / Editorial Story', category: 'Editorial', description: 'Magazine-style visual story with shoppable editorial context.', bestFor: 'Seasonal storytelling', tags: ['lookbook', 'editorial', 'story'], icon: Newspaper, miniPreview: MiniLookbookPreview, fullPreview: full(MiniLookbookPreview, 'Lookbook / Editorial Story'), defaults: { layout: 'magazine', imageOne: 'https://images.unsplash.com/photo-1506629905607-d9b297d84219?auto=format&fit=crop&w=1200&q=85', imageTwo: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85', shopTheLookIds: '', ctaText: 'View Lookbook', ctaLink: '/lookbook' }, requiredFields: ['content.imageOne'], editableFields: ['Layout', 'Images', 'Shop the look IDs', 'CTA label', 'CTA link'] },
  { type: 'brand_story', name: 'Brand Story', category: 'Editorial', description: 'Text-led brand narrative with supporting image and premium editorial tone.', bestFor: 'Brand positioning and trust', tags: ['brand', 'story', 'editorial'], icon: Sparkles, miniPreview: MiniBrandStoryPreview, fullPreview: full(MiniBrandStoryPreview, 'Brand Story'), defaults: { founderNote: 'Every piece is shaped around confidence, comfort, and premium everyday wear.', craftsmanshipImage: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=85', ctaText: 'Read The Story', ctaLink: '/journal' }, requiredFields: ['content.founderNote'], editableFields: ['Story body', 'Image', 'CTA label', 'CTA link'] },
  { type: 'fullscreen_collection_landing', name: 'Fullscreen Collection Landing', category: 'Hero', description: 'Immersive collection scenes stacked as full-screen editorial panels.', bestFor: 'Collection worlds and campaign landings', tags: ['fullscreen', 'collection', 'hero'], icon: Rows3, miniPreview: MiniFullscreenCollectionPreview, fullPreview: full(MiniFullscreenCollectionPreview, 'Fullscreen Collection Landing'), defaults: { scenes: 'Transit|https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85|The city after midnight\nUniform|https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85|Cut for repetition', productInsertIds: '' }, requiredFields: ['content.scenes'], editableFields: ['Scenes', 'Product inserts'] },
  { type: 'popup_campaign', name: 'Popup Campaign', category: 'Marketing', description: 'Modal-style campaign capture for private lists, offers, and launch access.', bestFor: 'Email capture and sale urgency', tags: ['popup', 'newsletter', 'sale', 'campaign'], icon: Mail, miniPreview: MiniPopupCampaignPreview, fullPreview: full(MiniPopupCampaignPreview, 'Popup Campaign'), defaults: { popupType: 'newsletter', trigger: 'first-visit', showOnce: true, offerText: 'Private access before the public drop', desktopImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85', mobileImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85' }, requiredFields: ['content.offerText'], editableFields: ['Popup type', 'Trigger', 'Show once', 'Offer text', 'Images'] },
  { type: 'newsletter', name: 'Newsletter Section', category: 'Marketing', description: 'Homepage signup section for private drops and early access.', bestFor: 'Audience growth', tags: ['newsletter', 'email', 'marketing'], icon: Mail, miniPreview: MiniNewsletterPreview, fullPreview: full(MiniNewsletterPreview, 'Newsletter Section'), defaults: { offerText: 'Private drops, early access, and nothing unnecessary.', privacyNote: 'No noise. Unsubscribe anytime.' }, requiredFields: ['content.offerText'], editableFields: ['Title', 'Offer text', 'Privacy note'] },
  { type: 'social_proof', name: 'Social Proof', category: 'Social', description: 'Press, review, and testimonial strip for customer confidence.', bestFor: 'Trust and credibility', tags: ['review', 'testimonial', 'social', 'press'], icon: MessageSquareQuote, miniPreview: MiniSocialProofPreview, fullPreview: full(MiniSocialProofPreview, 'Social Proof'), defaults: { pressLogos: 'Vogue, Highsnobiety, Hypebeast', quote: 'A disciplined wardrobe language for the new luxury customer.', ugcImages: '' }, requiredFields: ['content.quote'], editableFields: ['Press logos', 'Quote', 'UGC images'] },
  { type: 'marquee_strip', name: 'Marquee Strip', category: 'Utility', description: 'Repeating motion strip for launch phrases and shopping cues.', bestFor: 'Energy between sections', tags: ['marquee', 'text', 'utility', 'sale'], icon: Rows3, miniPreview: MiniMarqueePreview, fullPreview: full(MiniMarqueePreview, 'Marquee Strip'), defaults: { text: 'NEW DROP - LIMITED STOCK - LUXURY STREETWEAR', speed: 18 }, requiredFields: ['content.text'], editableFields: ['Text', 'Speed'] },
  { type: 'shop_the_look', name: 'Shop The Look', category: 'Products', description: 'Outfit-led image with product hotspots for styled merchandising.', bestFor: 'Styled outfits and cross-sell', tags: ['product', 'look', 'hotspots', 'outfit', 'new'], badge: 'New', icon: Shirt, miniPreview: MiniShopTheLookPreview, fullPreview: full(MiniShopTheLookPreview, 'Shop The Look'), defaults: { image: 'https://images.unsplash.com/photo-1506629905607-d9b297d84219?auto=format&fit=crop&w=1400&q=85', hotspotLabels: 'Jacket|42|34\nTrousers|55|70', productIds: '', ctaText: 'View Product', ctaLink: '/shop' }, requiredFields: ['content.image'], editableFields: ['Image', 'Hotspots', 'Product IDs', 'CTA label', 'Direct product link'] },
  { type: 'featured_collection', name: 'Featured Collection', category: 'Products', description: 'Collection banner paired with a compact product row.', bestFor: 'Curated collection merchandising', tags: ['product', 'collection', 'featured'], icon: PackageSearch, miniPreview: MiniFeaturedCollectionPreview, fullPreview: full(MiniFeaturedCollectionPreview, 'Featured Collection'), defaults: { collectionLabel: 'Featured Collection', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=85', ctaText: 'Shop Collection', ctaLink: '/collections/featured', productIds: '' }, requiredFields: ['content.ctaLink'], editableFields: ['Collection label', 'Image', 'CTA label', 'CTA link', 'Product IDs'] },
  { type: 'limited_drop_timer', name: 'Limited Drop Timer', category: 'Marketing', description: 'Countdown timer for limited drops and urgency-led launches.', bestFor: 'Time-boxed product launches', tags: ['timer', 'drop', 'limited', 'sale', 'launch'], icon: Timer, miniPreview: MiniLimitedDropTimerPreview, fullPreview: full(MiniLimitedDropTimerPreview, 'Limited Drop Timer'), defaults: { label: 'Limited Drop', endDateTime: futureDate(3) + 'T20:00', ctaText: 'Shop The Drop', ctaLink: '/drops' }, requiredFields: ['content.endDateTime'], editableFields: ['Label', 'End date/time', 'CTA label', 'CTA link'] },
  { type: 'recently_viewed', name: 'Recently Viewed Products', category: 'Products', description: 'Personalized-style product row for recently viewed items.', bestFor: 'Returning shoppers and product recall', tags: ['product', 'recently viewed', 'personalized'], icon: Clock3, miniPreview: MiniRecentlyViewedPreview, fullPreview: full(MiniRecentlyViewedPreview, 'Recently Viewed Products'), defaults: { source: 'recently-viewed', limit: 4, fallbackText: 'Pick up where you left off.' }, requiredFields: ['title'], editableFields: ['Source', 'Limit', 'Fallback text'] },
  { type: 'best_sellers', name: 'Best Sellers', category: 'Products', description: 'Ranked product block for proven products and high-intent discovery.', bestFor: 'Top sellers and conversion', tags: ['product', 'best sellers', 'ranking', 'conversion'], icon: Trophy, miniPreview: MiniBestSellersPreview, fullPreview: full(MiniBestSellersPreview, 'Best Sellers'), defaults: { source: 'best-sellers', limit: 6, showRank: true, productIds: '' }, requiredFields: ['title'], editableFields: ['Source', 'Limit', 'Show rank', 'Product IDs'] }
];

export const getSectionTemplate = (type: CmsSectionType): SectionTemplate => SECTION_TEMPLATES.find((template) => template.type === type) ?? SECTION_TEMPLATES[1];

export function createDefaultSectionInput(type: CmsSectionType, sortOrder = 0, overrides: Partial<CmsSectionInput> = {}): CmsSectionInput {
  const template = getSectionTemplate(type);
  const overrideContent = (overrides.content ?? {}) as ContentState;
  return {
    ...baseInput(type, overrides.title ?? template.name, overrides.subtitle ?? defaultSubtitle(type), { ...template.defaults, ...overrideContent }, sortOrder),
    ...overrides,
    content: { ...template.defaults, ...overrideContent },
    sortOrder
  };
}

export function sectionDtoToInput(section: CmsSectionDto, sortOrder = section.sortOrder): CmsSectionInput {
  const type = (section.type ?? 'hero_campaign') as CmsSectionType;
  return {
    pageTarget: section.pageTarget ?? 'home',
    type,
    title: section.title,
    subtitle: section.subtitle ?? '',
    description: section.description ?? getSectionTemplate(type).description,
    content: { ...getSectionTemplate(type).defaults, ...(section.content ?? {}) },
    styles: section.styles ?? {},
    products: Array.isArray(section.products) ? section.products.map((item) => typeof item === 'string' ? item : item.id ?? item._id ?? '').filter(Boolean) : [],
    categories: Array.isArray(section.categories) ? section.categories.map((item) => typeof item === 'string' ? item : item.id ?? item._id ?? '').filter(Boolean) : [],
    sortOrder,
    active: section.active ?? section.isActive ?? true,
    hideOnDesktop: type === 'mobile_media_landing' ? true : section.hideOnDesktop ?? false,
    hideOnMobile: type === 'mobile_media_landing' ? false : section.hideOnMobile ?? false,
    status: 'draft',
    startDate: section.startDate ? section.startDate.slice(0, 10) : today(),
    endDate: section.endDate ? section.endDate.slice(0, 10) : futureDate(45)
  };
}

export function createHomepageTemplates(currentSections: CmsSectionDto[]): HomepageTemplate[] {
  const current = currentSections.length ? currentSections.map((section, index) => sectionDtoToInput(section, index)) : [
    createDefaultSectionInput('hero_campaign', 0, { title: 'Cruisin Luxury Streetwear', subtitle: 'Dark essentials, editorial silhouettes, and limited drops built for the city.', content: { campaignLabel: 'CRUISIN', ctaText: 'Shop The Edit', ctaLink: '/shop' } }),
    createDefaultSectionInput('category_editorial_grid', 1, { title: 'Featured Collections' }),
    createDefaultSectionInput('discount_banner', 2, { title: 'Flash Sale', content: { discountTitle: 'Private Client Window', couponCode: 'CRUISIN15' } }),
    createDefaultSectionInput('best_sellers', 3, { title: 'Best Sellers' }),
    createDefaultSectionInput('product_carousel', 4, { title: 'New Arrivals' }),
    createDefaultSectionInput('social_proof', 5, { title: 'From The Community' }),
    createDefaultSectionInput('newsletter', 6, { title: 'Join The Private List' })
  ];

  return [
    { id: 'current-homepage-default', name: 'Current Homepage / Default Homepage', label: 'Default', description: 'The existing homepage layout currently used by the store.', bestFor: 'Keeping the current live homepage structure.', tags: ['Default', 'Safe', 'Current'], isDefault: true, isSystemTemplate: true, sections: current },
    { id: 'luxury-drop-launch', name: 'Luxury Drop Launch', description: 'Premium homepage for new drops and limited launches.', bestFor: 'New collection launches, limited drops, hype campaigns.', tags: ['Launch', 'Drop', 'Recommended'], sections: [
      createDefaultSectionInput('announcement_bar', 0, { title: 'Private Shipping Notice' }),
      createDefaultSectionInput('hero_campaign', 1, { title: 'Luxury Streetwear Essentials', subtitle: 'A limited release crafted for statement everyday dressing.', content: { campaignLabel: 'NEW DROP', ctaText: 'Shop The Drop', ctaLink: '/drops' } }),
      createDefaultSectionInput('limited_drop_timer', 2, { title: 'Drop Ends Soon', subtitle: 'Available for a short time only.' }),
      createDefaultSectionInput('hot_drop', 3, { title: 'Limited Drop' }),
      createDefaultSectionInput('product_carousel', 4, { title: 'The Drop Edit' }),
      createDefaultSectionInput('lookbook_story', 5, { title: 'Drop Notes' }),
      createDefaultSectionInput('newsletter', 6, { title: 'Join the Private List', subtitle: 'Get early access to limited releases.' })
    ] },
    { id: 'editorial-lookbook', name: 'Editorial Lookbook', description: 'Story-driven fashion homepage with lookbook and brand sections.', bestFor: 'Luxury branding, seasonal storytelling, campaign editorials.', tags: ['Editorial', 'Brand', 'Lookbook'], sections: [
      createDefaultSectionInput('hero_campaign', 0, { title: 'The New Street Uniform', subtitle: 'Explore silhouettes, textures, and essentials from the latest campaign.', content: { campaignLabel: 'EDITORIAL', ctaText: 'View Lookbook', ctaLink: '/lookbook' } }),
      createDefaultSectionInput('brand_story', 1, { title: 'Designed for Presence', content: { founderNote: 'Every piece is shaped around confidence, comfort, and premium everyday wear.' } }),
      createDefaultSectionInput('lookbook_story', 2, { title: 'Campaign Story' }),
      createDefaultSectionInput('category_editorial_grid', 3, { title: 'Shop The Story' }),
      createDefaultSectionInput('shop_the_look', 4, { title: 'Shop The Look' }),
      createDefaultSectionInput('social_proof', 5, { title: 'Worn With Intent' }),
      createDefaultSectionInput('newsletter', 6, { title: 'Editorial Access' })
    ] },
    { id: 'product-first-storefront', name: 'Product-First Storefront', description: 'Conversion-focused homepage for product discovery.', bestFor: 'Best sellers, trending products, featured collections.', tags: ['Conversion', 'Products', 'Best Sellers'], sections: [
      createDefaultSectionInput('announcement_bar', 0),
      createDefaultSectionInput('hero_campaign', 1, { title: 'The Pieces Everyone Wants', subtitle: 'Discover the most-wanted essentials from our latest collection.', content: { campaignLabel: 'BEST SELLERS', ctaText: 'Shop Best Sellers', ctaLink: '/collections/best-sellers' } }),
      createDefaultSectionInput('best_sellers', 2, { title: 'Best Sellers' }),
      createDefaultSectionInput('product_carousel', 3, { title: 'Best Sellers', subtitle: 'Pieces defining the season.' }),
      createDefaultSectionInput('trending_now', 4, { title: 'Trending Now' }),
      createDefaultSectionInput('featured_collection', 5, { title: 'Featured Collection' }),
      createDefaultSectionInput('recently_viewed', 6, { title: 'Recently Viewed' }),
      createDefaultSectionInput('discount_banner', 7, { title: 'Private Offer', subtitle: 'Use code LUXE10 at checkout.' })
    ] },
    { id: 'sale-campaign-homepage', name: 'Sale Campaign Homepage', description: 'Homepage for seasonal sales, discount campaigns, and high urgency promotions.', bestFor: 'Festive sale, end-of-season sale, clearance, limited-time campaigns.', tags: ['Sale', 'Marketing', 'Urgency'], sections: [
      createDefaultSectionInput('announcement_bar', 0, { content: { text: 'Sale window now open - limited stock' } }),
      createDefaultSectionInput('discount_banner', 1, { title: 'Private Sale', content: { discountTitle: 'End Of Season Edit', couponCode: 'LUXE10' } }),
      createDefaultSectionInput('hero_campaign', 2, { title: 'The Sale Edit', subtitle: 'Premium essentials, rarely discounted.', content: { campaignLabel: 'SALE', ctaText: 'Shop Sale', ctaLink: '/sale' } }),
      createDefaultSectionInput('product_carousel', 3, { title: 'Sale Picks' }),
      createDefaultSectionInput('best_sellers', 4, { title: 'Best Sellers On Sale' }),
      createDefaultSectionInput('popup_campaign', 5, { title: 'Private Offer' }),
      createDefaultSectionInput('marquee_strip', 6, { title: 'Sale Marquee' })
    ] }
  ];
}

function defaultSubtitle(type: CmsSectionType): string {
  if (type === 'hero_campaign') return 'Explore the latest drop crafted for everyday statement dressing.';
  if (type === 'newsletter') return 'Early access, private drops, and curated edits.';
  if (type === 'brand_story') return 'A quieter approach to luxury streetwear.';
  if (type === 'limited_drop_timer') return 'Available for a short time only.';
  return 'Ready-made premium homepage section.';
}
