// Governed by .rules v1.0
'use client';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { Archive, CalendarClock, Clock, Copy, Eye, GripVertical, History, LayoutTemplate, Megaphone, Monitor, PanelsTopLeft, Plus, Rocket, Save, Smartphone, Sparkles, ToggleLeft, ToggleRight, Trash2, Video } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useArchiveCmsSection, useCreateCmsMedia, useCreateCmsSection, usePublishCmsPage, useReorderCmsSections, useRestoreCmsVersion, useUpdateCmsSection, type CmsSectionInput } from '@/hooks/useAdminMutations';
import { useCmsMedia, useCmsPages, useCmsPageSections, useCmsVersions } from '@/hooks/useAdminResources';
import { cn } from '@/lib/utils';
import type { CmsMediaDto, CmsPageDto, CmsSectionDto, CmsSectionType, CmsStatus } from '@/types/dto.types';

export interface CmsBuilderProps { }

type DevicePreview = 'desktop' | 'tablet' | 'mobile';
type ContentValue = string | number | boolean;
type ContentState = Record<string, ContentValue>;

interface SectionTypeConfig {
  type: CmsSectionType;
  label: string;
  icon: typeof LayoutTemplate;
  defaults: ContentState;
}

const sectionTypes: SectionTypeConfig[] = [
  { type: 'announcement_bar', label: 'Announcement Bar', icon: Megaphone, defaults: { text: 'Complimentary shipping on private orders', link: '/shop', backgroundColor: '#0f0f0f', autoHide: false } },
  { type: 'hero_campaign', label: 'Hero Campaign', icon: Sparkles, defaults: { campaignLabel: 'Drop 04 / Black Transit', desktopMedia: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=85', mobileMedia: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85', ctaText: 'Enter The Drop', ctaLink: '/shop', textPlacement: 'bottom-left', overlayOpacity: 48 } },
  { type: 'video_landing', label: 'Single Video Landing', icon: Video, defaults: { videoUrl: '/hero.mp4', posterImage: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85', autoplay: true, muted: true, loop: true, ctaText: 'Shop The Film', ctaLink: '/shop', mobileFallbackImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' } },
  { type: 'image_carousel', label: 'Image Carousel', icon: PanelsTopLeft, defaults: { slides: 'Campaign One|https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85|/shop\nCampaign Two|https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=85|/collections', autoSlideSpeed: 5, manualArrows: true, dotIndicators: true } },
  { type: 'product_carousel', label: 'Product Carousel', icon: LayoutTemplate, defaults: { source: 'new-arrivals', productIds: '', limit: 8, cardStyle: 'editorial' } },
  { type: 'hot_drop', label: 'Hot Drop', icon: Rocket, defaults: { dropName: 'Black Transit', launchDate: nextWeek(), productIds: '', notifyText: 'Notify Me', soldOut: false } },
  { type: 'trending_now', label: 'Trending Now', icon: Sparkles, defaults: { source: 'views-orders', manualOverride: false, productIds: '', limit: 8, cardStyle: 'minimal' } },
  { type: 'discount_banner', label: 'Discount Banner', icon: Megaphone, defaults: { discountTitle: 'Private Client Window', couponCode: 'CRUISIN15', ctaText: 'Apply Code', ctaLink: '/shop' } },
  { type: 'category_editorial_grid', label: 'Category Editorial Grid', icon: PanelsTopLeft, defaults: { tiles: 'Men|https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&w=1000&q=85|/shop?category=men\nWomen|https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1000&q=85|/shop?category=women\nAccessories|https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1000&q=85|/shop?category=accessories' } },
  { type: 'lookbook_story', label: 'Lookbook / Editorial Story', icon: PanelsTopLeft, defaults: { layout: 'magazine', imageOne: 'https://images.unsplash.com/photo-1506629905607-d9b297d84219?auto=format&fit=crop&w=1200&q=85', imageTwo: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85', shopTheLookIds: '' } },
  { type: 'brand_story', label: 'Brand Story', icon: Sparkles, defaults: { founderNote: 'Built for quiet movement and deliberate wardrobes.', craftsmanshipImage: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=85', ctaText: 'Read The Story', ctaLink: '/journal' } },
  { type: 'fullscreen_collection_landing', label: 'Fullscreen Collection Landing', icon: Monitor, defaults: { scenes: 'Transit|https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85|The city after midnight\nUniform|https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85|Cut for repetition', productInsertIds: '' } },
  { type: 'popup_campaign', label: 'Popup Campaign', icon: Megaphone, defaults: { popupType: 'newsletter', trigger: 'first-visit', showOnce: true, offerText: 'Private access before the public drop', desktopImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85', mobileImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85' } },
  { type: 'newsletter', label: 'Newsletter Section', icon: Megaphone, defaults: { offerText: 'Private drops, early access, and nothing unnecessary.', privacyNote: 'No noise. Unsubscribe anytime.' } },
  { type: 'social_proof', label: 'Social Proof', icon: Sparkles, defaults: { pressLogos: 'Vogue, Highsnobiety, Hypebeast', quote: 'A disciplined wardrobe language for the new luxury customer.', ugcImages: '' } },
  { type: 'marquee_strip', label: 'Marquee Strip', icon: Megaphone, defaults: { text: 'PRIVATE DROPS / FREE SHIPPING / BLACK TRANSIT / QUIET LUXURY', speed: 18 } }
];

const statusOptions = [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' }];
const targetOptions = [{ label: 'Home', value: 'home' }, { label: 'Men landing page', value: 'men' }, { label: 'Women landing page', value: 'women' }, { label: 'Collection page', value: 'collection' }, { label: 'Sale page', value: 'sale' }, { label: 'Drop page', value: 'drop' }, { label: 'Custom landing page', value: 'custom' }];
const boolOptions = [{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }];

const sectionId = (section: CmsSectionDto): string => section.id ?? section._id ?? section.title;
const pageId = (page?: CmsPageDto): string | undefined => page?.id ?? page?._id;
const today = (): string => new Date().toISOString().slice(0, 10);
const nextMonth = (): string => { const date = new Date(); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 10); };
function nextWeek(): string { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); }
const typeConfig = (type: CmsSectionType): SectionTypeConfig => sectionTypes.find((item) => item.type === type) ?? sectionTypes[1];
const isActive = (section: CmsSectionDto): boolean => section.active ?? section.isActive ?? false;
const scheduleLabel = (section: CmsSectionDto): string => section.startDate || section.endDate ? 'Scheduled' : 'Always on';
const contentValue = (value: unknown): ContentValue => typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' ? value : '';
const normalizeContent = (section?: CmsSectionDto): ContentState => ({ ...typeConfig((section?.type ?? 'hero_campaign') as CmsSectionType).defaults, ...Object.fromEntries(Object.entries(section?.content ?? {}).map(([key, value]) => [key, contentValue(value)])) });
const parseIds = (value: ContentValue | undefined): string[] => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

const mediaUrl = (content: ContentState, device: DevicePreview): string => {
  if (device === 'mobile') return String(content.mobileMedia || content.mobileImage || content.mobileFallbackImage || content.desktopMedia || content.imageOne || '');
  return String(content.desktopMedia || content.posterImage || content.imageOne || content.mobileMedia || '');
};

function SectionRow({ section, selected, onSelect, onDuplicate, onArchive, onToggle }: { section: CmsSectionDto; selected: boolean; onSelect: () => void; onDuplicate: () => void; onArchive: () => void; onToggle: () => void; }): ReactNode {
  const id = sectionId(section);
  const config = typeConfig((section.type ?? 'hero_campaign') as CmsSectionType);
  const Icon = config.icon;
  const draggable = useDraggable({ id });
  const droppable = useDroppable({ id });
  return <article ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} className={cn('border bg-background-elevated transition', selected ? 'border-accent-gold shadow-gold' : 'border-border hover:border-border-strong')}>
    <button type="button" onClick={onSelect} className="grid w-full grid-cols-[32px_1fr] gap-3 p-4 text-left">
      <span {...draggable.listeners} {...draggable.attributes} className="flex h-9 w-9 cursor-grab items-center justify-center border border-border bg-background-primary text-text-secondary active:cursor-grabbing"><GripVertical size={16} /></span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-accent-gold"><Icon size={15} />{config.label}</span>
        <span className="mt-2 block truncate font-display text-xl text-text-primary">{section.title}</span>
        <span className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone={isActive(section) ? 'success' : 'neutral'}>{isActive(section) ? COPY.table.active : COPY.table.inactive}</StatusPill>
          <StatusPill tone={section.status === 'published' ? 'success' : 'gold'}>{section.status ?? 'draft'}</StatusPill>
          <StatusPill tone="neutral">{scheduleLabel(section)}</StatusPill>
        </span>
      </span>
    </button>
    <div className="grid grid-cols-4 border-t border-border-subtle">
      <button type="button" className="flex h-10 items-center justify-center text-text-secondary hover:text-text-primary" aria-label="Toggle section" onClick={onToggle}>{isActive(section) ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button>
      <button type="button" className="flex h-10 items-center justify-center text-text-secondary hover:text-text-primary" aria-label="Duplicate section" onClick={onDuplicate}><Copy size={16} /></button>
      <button type="button" className="flex h-10 items-center justify-center text-text-secondary hover:text-text-primary" aria-label="Quick preview" onClick={onSelect}><Eye size={16} /></button>
      <button type="button" className="flex h-10 items-center justify-center text-danger hover:brightness-125" aria-label="Archive section" onClick={onArchive}><Trash2 size={16} /></button>
    </div>
  </article>;
}

function PreviewSection({ section, device, includeInactive }: { section: CmsSectionDto; device: DevicePreview; includeInactive: boolean; }): ReactNode {
  if (!includeInactive && !isActive(section)) return null;
  const content = normalizeContent(section);
  const config = typeConfig((section.type ?? 'hero_campaign') as CmsSectionType);
  const image = mediaUrl(content, device);
  const overlay = Number(content.overlayOpacity || 42) / 100;
  if (section.type === 'announcement_bar' || section.type === 'marquee_strip') return <div className="overflow-hidden border-b border-white/15 px-4 py-3 text-center text-[10px] uppercase tracking-[0.18em]" style={{ backgroundColor: String(content.backgroundColor || '#0f0f0f') }}>{String(content.text ?? section.title)}</div>;
  if (section.type === 'discount_banner') return <section className="border-y border-white/15 px-5 py-8 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{String(content.couponCode ?? '')}</p><h3 className="mt-3 font-display text-3xl">{String(content.discountTitle || section.title)}</h3><p className="mt-4 text-xs uppercase tracking-[0.14em]">{String(content.ctaText ?? 'Shop now')}</p></section>;
  if (section.type === 'newsletter') return <section className="px-5 py-10 text-center"><h3 className="font-display text-3xl">{section.title}</h3><p className="mx-auto mt-3 max-w-sm text-sm text-text-secondary">{String(content.offerText || section.subtitle)}</p><div className="mx-auto mt-6 flex max-w-sm border border-white/20"><span className="flex-1 px-4 py-3 text-left text-xs text-text-muted">Email address</span><span className="bg-[#c8a97e] px-4 py-3 text-xs uppercase text-[#080808]">Join</span></div></section>;
  if (section.type === 'product_carousel' || section.type === 'trending_now' || section.type === 'hot_drop') return <section className="px-5 py-10"><p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{config.label}</p><h3 className="mt-3 font-display text-3xl">{section.title}</h3><div className="mt-6 grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[3/4] bg-white/10 p-3"><div className="h-full border border-white/10" /></div>)}</div></section>;
  if (section.type === 'category_editorial_grid') return <section className="grid grid-cols-2 gap-px p-5">{String(content.tiles ?? '').split('\n').slice(0, 4).map((tile) => { const [label, url] = tile.split('|'); return <div key={tile} className="relative aspect-[3/4] overflow-hidden bg-white/10">{url ? <img src={url} alt="" className="h-full w-full object-cover opacity-80" /> : null}<p className="absolute bottom-4 left-4 font-display text-2xl">{label}</p></div>; })}</section>;
  return <section className="relative min-h-[520px] overflow-hidden bg-background-primary">
    {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}
    <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
    <div className="relative flex min-h-[520px] flex-col justify-end p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{String(content.campaignLabel || config.label)}</p>
      <h3 className="mt-4 max-w-lg font-display text-4xl text-text-primary">{section.title}</h3>
      <p className="mt-3 max-w-md text-sm text-text-secondary">{section.subtitle}</p>
      <p className="mt-7 text-xs uppercase tracking-[0.14em]">{String(content.ctaText || 'Explore')}</p>
    </div>
  </section>;
}

function VersionHistory({ versions, onRestore, isRestoring }: { versions: Array<{ _id?: string; id?: string; label?: string; status: string; createdAt?: string }>; onRestore: (id: string) => void; isRestoring: boolean; }): ReactNode {
  return <div className="border border-border bg-background-elevated p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-accent-gold"><History size={15} />Version History</div>
    <div className="mt-4 grid gap-2">{versions.length ? versions.slice(0, 4).map((version) => { const id = version.id ?? version._id ?? ''; return <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 border border-border-subtle p-3"><div><p className="text-sm text-text-primary">{version.label || version.status}</p><p className="mt-1 text-xs text-text-secondary">{version.createdAt ? new Date(version.createdAt).toLocaleString() : 'Saved version'}</p></div><Button type="button" variant="ghost" disabled={isRestoring} onClick={() => onRestore(id)}>Restore</Button></div>; }) : <p className="text-sm text-text-secondary">Publish once to create a recoverable version.</p>}</div>
  </div>;
}

function MediaManager({ media, onCreate, isSaving }: { media: CmsMediaDto[]; onCreate: (media: CmsMediaDto) => void; isSaving: boolean; }): ReactNode {
  const [draft, setDraft] = useState<CmsMediaDto>({ url: '', type: 'image', alt: '', cropFocus: 'center', lazy: true });
  return <div className="border border-border bg-background-elevated p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-accent-gold"><Archive size={15} />Media Manager</div>
    <div className="mt-4 grid gap-3">
      <Input label="Media URL" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Type" options={[{ label: 'Image', value: 'image' }, { label: 'Video', value: 'video' }]} value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as 'image' | 'video' }))} />
        <SelectField label="Crop Focus" options={['center', 'top', 'bottom', 'left', 'right'].map((item) => ({ label: item, value: item }))} value={draft.cropFocus} onChange={(event) => setDraft((current) => ({ ...current, cropFocus: event.target.value as CmsMediaDto['cropFocus'] }))} />
      </div>
      <Input label="Alt Text" value={draft.alt} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} />
      <Button type="button" disabled={isSaving || !draft.url} onClick={() => onCreate(draft)}>{isSaving ? COPY.common.loading : 'Save Media'}</Button>
    </div>
    <div className="mt-5 grid max-h-56 gap-2 overflow-auto">{media.slice(0, 8).map((item) => <button key={item.id ?? item._id ?? item.url} type="button" className="truncate border border-border-subtle px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary" onClick={() => navigator.clipboard?.writeText(item.url)}>{item.type} / {item.alt || item.url}</button>)}</div>
  </div>;
}

export function CmsBuilder(_props: CmsBuilderProps): ReactNode {
  const pages = useCmsPages();
  const homePage = useMemo(() => pages.data?.find((page) => page.slug === 'home') ?? pages.data?.[0], [pages.data]);
  const currentPageId = pageId(homePage);
  const sections = useCmsPageSections(currentPageId);
  const versions = useCmsVersions(currentPageId);
  const media = useCmsMedia();
  const createSection = useCreateCmsSection(currentPageId);
  const updateSection = useUpdateCmsSection(currentPageId);
  const archiveSection = useArchiveCmsSection(currentPageId);
  const reorderSections = useReorderCmsSections(currentPageId);
  const publishPage = usePublishCmsPage(currentPageId);
  const restoreVersion = useRestoreCmsVersion(currentPageId);
  const createMedia = useCreateCmsMedia();
  const sectionList = (sections.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = sectionList.find((section) => sectionId(section) === selectedId) ?? sectionList[0];
  const [device, setDevice] = useState<DevicePreview>('desktop');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [draft, setDraft] = useState<CmsSectionInput>(() => toInput(selected));

  useEffect(() => {
    if (!selectedId && sectionList[0]) setSelectedId(sectionId(sectionList[0]));
  }, [sectionList, selectedId]);

  useEffect(() => {
    setDraft(toInput(selected));
  }, [selected]);

  const onDragEnd = (event: DragEndEvent): void => {
    if (!event.over || event.active.id === event.over.id) return;
    const ids = sectionList.map(sectionId);
    const activeIndex = ids.indexOf(String(event.active.id));
    const overIndex = ids.indexOf(String(event.over.id));
    if (activeIndex < 0 || overIndex < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(activeIndex, 1);
    if (!moved) return;
    nextIds.splice(overIndex, 0, moved);
    reorderSections.mutate(nextIds);
  };

  const updateContent = (key: string, value: ContentValue): void => setDraft((current) => ({ ...current, content: { ...current.content, [key]: value } }));
  const updateField = <TKey extends keyof CmsSectionInput>(key: TKey, value: CmsSectionInput[TKey]): void => setDraft((current) => ({ ...current, [key]: value }));
  const saveDraft = (): void => {
    if (!selected) return;
    updateSection.mutate({ ...draft, id: sectionId(selected) });
  };
  const addSection = (type: CmsSectionType = 'hero_campaign'): void => {
    const config = typeConfig(type);
    createSection.mutate({ pageTarget: 'home', type, title: config.label, subtitle: 'New campaign section', description: '', content: config.defaults, styles: {}, products: [], categories: [], sortOrder: sectionList.length, active: true, hideOnDesktop: false, hideOnMobile: false, status: 'draft', startDate: today(), endDate: nextMonth() }, { onSuccess: (section) => setSelectedId(sectionId(section)) });
  };
  const duplicateSection = (section: CmsSectionDto): void => {
    const input = toInput(section);
    createSection.mutate({ ...input, title: input.title + ' Copy', status: 'draft', sortOrder: sectionList.length }, { onSuccess: (next) => setSelectedId(sectionId(next)) });
  };
  const toggleActive = (section: CmsSectionDto): void => {
    updateSection.mutate({ ...toInput(section), id: sectionId(section), active: !isActive(section) });
  };

  return <DndContext onDragEnd={onDragEnd}>
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 border border-border bg-background-elevated p-4 shadow-lg xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Homepage Builder</p>
          <h2 className="mt-2 font-display text-3xl text-text-primary">{homePage?.title ?? 'Homepage'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => addSection()} disabled={!currentPageId || createSection.isPending}><Plus size={16} />Add Section</Button>
          <Button type="button" variant="secondary" onClick={saveDraft} disabled={!selected || updateSection.isPending}><Save size={16} />Save Draft</Button>
          <Button type="button" variant="secondary" onClick={() => setIncludeInactive((current) => !current)}><Eye size={16} />Preview</Button>
          <Button type="button" onClick={() => publishPage.mutate()} disabled={!currentPageId || publishPage.isPending}><Rocket size={16} />Publish</Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)_420px]">
        <aside className="grid content-start gap-4">
          <div className="border border-border bg-background-elevated p-4">
            <h3 className="font-display text-xl">Section Blocks</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">{sectionTypes.map((item) => { const Icon = item.icon; return <button key={item.type} type="button" onClick={() => addSection(item.type)} className="min-h-20 border border-border-subtle bg-background-primary p-3 text-left text-xs uppercase tracking-[0.1em] text-text-secondary transition hover:border-border-strong hover:text-text-primary"><Icon size={16} className="mb-2 text-accent-gold" />{item.label}</button>; })}</div>
          </div>
          <div className="grid gap-3">{sections.isLoading ? <p className="text-sm text-text-secondary">{COPY.common.loading}</p> : sectionList.length > 0 ? sectionList.map((section) => <SectionRow key={sectionId(section)} section={section} selected={sectionId(section) === sectionId(selected)} onSelect={() => setSelectedId(sectionId(section))} onDuplicate={() => duplicateSection(section)} onArchive={() => archiveSection.mutate(sectionId(section))} onToggle={() => toggleActive(section)} />) : <EmptyPanel title="No homepage sections" message="Add a campaign block to start shaping the storefront." />}</div>
        </aside>

        <main className="grid content-start gap-5">
          <section className="border border-border bg-background-elevated p-5 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Selected Section Editor</p><h3 className="mt-2 font-display text-2xl">{selected?.title ?? 'No section selected'}</h3></div>
              {selected ? <StatusPill tone={draft.status === 'published' ? 'success' : 'gold'}>{draft.status}</StatusPill> : null}
            </div>
            {selected ? <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Section Type" options={sectionTypes.map((item) => ({ label: item.label, value: item.type }))} value={draft.type} onChange={(event) => { const type = event.target.value as CmsSectionType; setDraft((current) => ({ ...current, type, content: { ...typeConfig(type).defaults, ...current.content } })); }} />
                <SelectField label="Page Target" options={targetOptions} value={draft.pageTarget} onChange={(event) => updateField('pageTarget', event.target.value)} />
                <Input label={COPY.fields.title} value={draft.title} onChange={(event) => updateField('title', event.target.value)} />
                <Input label={COPY.fields.subtitle} value={draft.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} />
                <SelectField label={COPY.fields.status} options={statusOptions} value={draft.status} onChange={(event) => updateField('status', event.target.value as CmsStatus)} />
                <Input label={COPY.fields.sortOrder} type="number" value={draft.sortOrder} onChange={(event) => updateField('sortOrder', Number(event.target.value))} />
              </div>
              <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary"><span>Description</span><textarea className="mt-2 min-h-24 w-full border border-border-subtle bg-background-input px-4 py-3 text-sm normal-case tracking-normal text-text-primary" value={draft.description} onChange={(event) => updateField('description', event.target.value)} /></label>
              <div className="grid gap-4 md:grid-cols-3">
                <SelectField label="Active" options={boolOptions} value={String(draft.active)} onChange={(event) => updateField('active', event.target.value === 'true')} />
                <SelectField label="Hide Desktop" options={boolOptions} value={String(draft.hideOnDesktop)} onChange={(event) => updateField('hideOnDesktop', event.target.value === 'true')} />
                <SelectField label="Hide Mobile" options={boolOptions} value={String(draft.hideOnMobile)} onChange={(event) => updateField('hideOnMobile', event.target.value === 'true')} />
                <Input label={COPY.fields.startDate} type="date" value={draft.startDate ?? ''} onChange={(event) => updateField('startDate', event.target.value)} />
                <Input label={COPY.fields.endDate} type="date" value={draft.endDate ?? ''} onChange={(event) => updateField('endDate', event.target.value)} />
              </div>
              <div className="border border-border-subtle p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-accent-gold"><CalendarClock size={15} />Campaign Content</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(draft.content).map(([key, value]) => <ContentInput key={key} name={key} value={contentValue(value)} onChange={(next) => updateContent(key, next)} />)}</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Manual Product IDs" value={parseIds(contentValue(draft.content.productIds)).join(', ')} onChange={(event) => updateContent('productIds', event.target.value)} />
                <Input label="Manual Category IDs" value={draft.categories.join(', ')} onChange={(event) => updateField('categories', parseIds(event.target.value))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveDraft} disabled={updateSection.isPending}>{updateSection.isPending ? COPY.common.loading : 'Save Section'}</Button>
                <Button type="button" variant="secondary" onClick={() => duplicateSection(selected)}><Copy size={16} />Duplicate</Button>
                <Button type="button" variant="danger" onClick={() => archiveSection.mutate(sectionId(selected))}><Trash2 size={16} />Archive</Button>
              </div>
              {updateSection.error ? <p className="text-sm text-danger">{updateSection.error.message}</p> : null}
            </div> : <div className="mt-6"><EmptyPanel title="No section selected" message="Create a section to edit its campaign fields." /></div>}
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <VersionHistory versions={versions.data ?? []} isRestoring={restoreVersion.isPending} onRestore={(id) => restoreVersion.mutate(id)} />
            <MediaManager media={media.data ?? []} isSaving={createMedia.isPending} onCreate={(input) => createMedia.mutate(input)} />
          </div>
        </main>

        <aside className="grid content-start gap-4">
          <div className="border border-border bg-background-elevated p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl">Live Preview</h3>
              <div className="flex border border-border-subtle">
                {(['desktop', 'tablet', 'mobile'] as DevicePreview[]).map((item) => <button key={item} type="button" aria-label={item} className={cn('flex h-10 w-11 items-center justify-center text-text-secondary', device === item && 'bg-accent-gold text-text-inverse')} onClick={() => setDevice(item)}>{item === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}</button>)}
              </div>
            </div>
            <div className={cn('mx-auto mt-5 overflow-hidden border border-border bg-background-primary shadow-lg', device === 'desktop' && 'h-[720px] w-full', device === 'tablet' && 'h-[720px] w-[82%]', device === 'mobile' && 'h-[720px] w-[375px] max-w-full')}>
              <div className="h-full overflow-auto">{sectionList.length ? sectionList.map((section) => <PreviewSection key={sectionId(section)} section={sectionId(section) === sectionId(selected) ? { ...section, ...draft, content: draft.content, active: draft.active, isActive: draft.active } : section} device={device} includeInactive={includeInactive} />) : <div className="p-6 text-sm text-text-secondary">{COPY.cms.empty}</div>}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border bg-background-elevated p-4"><Clock size={16} className="text-accent-gold" /><p className="mt-3 font-mono text-2xl">{sectionList.filter((section) => section.status === 'published').length}</p><p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Published</p></div>
            <div className="border border-border bg-background-elevated p-4"><Eye size={16} className="text-accent-gold" /><p className="mt-3 font-mono text-2xl">{sectionList.filter(isActive).length}</p><p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Visible</p></div>
          </div>
        </aside>
      </div>
    </div>
  </DndContext>;
}

function ContentInput({ name, value, onChange }: { name: string; value: ContentValue; onChange: (value: ContentValue) => void; }): ReactNode {
  const label = name.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => match.toUpperCase());
  if (typeof value === 'boolean') return <SelectField label={label} options={boolOptions} value={String(value)} onChange={(event) => onChange(event.target.value === 'true')} />;
  const multiline = ['slides', 'tiles', 'scenes', 'pressLogos', 'ugcImages'].includes(name);
  if (multiline) return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary md:col-span-2"><span>{label}</span><textarea className="mt-2 min-h-28 w-full border border-border-subtle bg-background-input px-4 py-3 text-sm normal-case tracking-normal text-text-primary" value={String(value)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} /></label>;
  return <Input label={label} type={typeof value === 'number' ? 'number' : 'text'} value={String(value)} onChange={(event) => onChange(typeof value === 'number' ? Number(event.target.value) : event.target.value)} />;
}

function toInput(section?: CmsSectionDto): CmsSectionInput {
  const type = (section?.type ?? 'hero_campaign') as CmsSectionType;
  const content = normalizeContent(section);
  return {
    pageTarget: section?.pageTarget ?? 'home',
    type,
    title: section?.title ?? typeConfig(type).label,
    subtitle: section?.subtitle ?? '',
    description: section?.description ?? '',
    content,
    styles: section?.styles ?? {},
    products: Array.isArray(section?.products) ? section.products.map((item) => typeof item === 'string' ? item : item.id ?? item._id ?? '').filter(Boolean) : parseIds(content.productIds),
    categories: Array.isArray(section?.categories) ? section.categories.map((item) => typeof item === 'string' ? item : item.id ?? item._id ?? '').filter(Boolean) : [],
    sortOrder: section?.sortOrder ?? 0,
    active: section ? isActive(section) : true,
    hideOnDesktop: section?.hideOnDesktop ?? false,
    hideOnMobile: section?.hideOnMobile ?? false,
    status: section?.status ?? 'draft',
    startDate: section?.startDate ? section.startDate.slice(0, 10) : today(),
    endDate: section?.endDate ? section.endDate.slice(0, 10) : nextMonth()
  };
}
