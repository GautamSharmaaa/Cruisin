// Governed by .rules v1.0
'use client';

import { Archive, Check, Columns3, Eye, EyeOff, Layers3, Pencil, Plus, Save, Settings, Tags, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminCollections, useAdminNavigation, useAdminPageSettings, useAdminSiteSettings, useAdminTags } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { slugify } from '@/lib/utils';
import type { CollectionDto, MegaMenuCollectionCardDto, MegaMenuColumnDto, MegaMenuLinkDto, MegaMenuPromoDto, NavigationItemDto, PageSettingsDto, TagDto } from '@/types/dto.types';

type Tab = 'navigation' | 'mega-menu' | 'collections' | 'filters' | 'pages' | 'settings';
type Toast = { tone: 'success' | 'error'; message: string } | null;

const navTypes = ['simple_link', 'mega_menu', 'collection_link', 'category_link', 'custom_url'] as const;
const layoutTypes = ['text-columns', 'collection-grid', 'custom-link'] as const;
const linkTypes = ['category', 'subcategory', 'collection', 'product_listing', 'static_page', 'custom_url'] as const;
const sortOptions = ['newest', 'price-asc', 'price-desc', 'best-selling', 'top-rated'] as const;
const gridOptions = [4, 2, 1] as const;

const idOf = (item: { id?: string; _id?: string; slug?: string; title?: string; label?: string }): string => item.id ?? item._id ?? item.slug ?? item.title ?? item.label ?? '';
const referenceId = (item: string | { id?: string; _id?: string } | null | undefined): string => {
  if (!item) return '';
  return typeof item === 'string' ? item : item.id ?? item._id ?? '';
};
const referencesToCsv = (items: Array<string | { id?: string; _id?: string }> | undefined): string => (items ?? []).map(referenceId).filter(Boolean).join(', ');
const csvToIds = (value: string): string[] => value.split(',').map((item) => item.trim()).filter(Boolean);

const navDefaults = { label: '', slug: '', href: '/', type: 'mega_menu', menuLayoutType: 'text-columns', sortOrder: 0, isVisible: true, isMegaMenuEnabled: true, isDefaultActive: false };
const columnDefaults = { navItemId: '', title: '', sortOrder: 0, isVisible: true };
const linkDefaults = { columnId: '', label: '', href: '/', linkedType: 'custom_url', linkedId: '', sortOrder: 0, isVisible: true, isHighlighted: false, showArrow: false };
const cardDefaults = { navItemId: '', collectionId: '', titleOverride: '', slugOverride: '', imageOverride: '', mobileImageOverride: '', sortOrder: 0, isVisible: true };
const promoDefaults = { navItemId: '', eyebrow: '', title: '', subtitle: '', image: '', mobileImage: '', buttonLabel: '', buttonHref: '', overlayOpacity: 0.5, showOnDesktop: true, showOnMobile: true, isVisible: true };
const collectionDefaults = { title: '', slug: '', description: '', heroTitle: '', heroSubtitle: '', heroImage: '', mobileHeroImage: '', cardImage: '', thumbnailImage: '', bannerImage: '', mobileBannerImage: '', mobileImage: '', collectionVideo: '', mobileCollectionVideo: '', backgroundVideo: '', videoPosterImage: '', imageAltText: '', isBannerVisible: false, productIds: '', categoryIds: '', productSortOrder: '', sortOrder: 0, isVisible: true, isPublished: true, isFeatured: false, showInMenu: true, menuCardImage: '', mobileMenuCardImage: '', menuCardTitleOverride: '', menuCardOrder: 0, defaultSort: 'newest', defaultGridView: 4, areFiltersVisible: true, isAdvancedFilterEnabled: true, isFlashlightEnabled: true, seoTitle: '', seoDescription: '', ogImage: '', tags: '' };
const tagDefaults = { name: '', slug: '', sortOrder: 0, isVisible: true };
const pageDefaults = { pageType: 'landing', pageSlug: '', title: '', subtitle: '', heroImage: '', mobileHeroImage: '', heroVideo: '', mobileHeroVideo: '', bannerImage: '', mobileBannerImage: '', bannerVideo: '', mobileBannerVideo: '', videoPosterImage: '', ctaText: '', ctaLink: '', isBannerVisible: false, defaultSort: 'newest', defaultGridView: 4, areFiltersVisible: true, isAdvancedFilterEnabled: true, isFlashlightEnabled: true, seoTitle: '', seoDescription: '', ogImage: '', isPublished: true };

export function StorefrontManager(): ReactNode {
  const queryClient = useQueryClient();
  const navigation = useAdminNavigation();
  const collections = useAdminCollections();
  const tags = useAdminTags();
  const pages = useAdminPageSettings();
  const site = useAdminSiteSettings();
  const [tab, setTab] = useState<Tab>('navigation');
  const [toast, setToast] = useState<Toast>(null);
  const [editingNav, setEditingNav] = useState<NavigationItemDto | null>(null);
  const [editingColumn, setEditingColumn] = useState<MegaMenuColumnDto | null>(null);
  const [editingLink, setEditingLink] = useState<MegaMenuLinkDto | null>(null);
  const [editingCard, setEditingCard] = useState<MegaMenuCollectionCardDto | null>(null);
  const [editingPromo, setEditingPromo] = useState<MegaMenuPromoDto | null>(null);
  const [editingCollection, setEditingCollection] = useState<CollectionDto | null>(null);
  const [editingTag, setEditingTag] = useState<TagDto | null>(null);
  const [editingPage, setEditingPage] = useState<PageSettingsDto | null>(null);
  const [navForm, setNavForm] = useState(navDefaults);
  const [columnForm, setColumnForm] = useState(columnDefaults);
  const [linkForm, setLinkForm] = useState(linkDefaults);
  const [cardForm, setCardForm] = useState(cardDefaults);
  const [promoForm, setPromoForm] = useState(promoDefaults);
  const [collectionForm, setCollectionForm] = useState(collectionDefaults);
  const [tagForm, setTagForm] = useState(tagDefaults);
  const [pageForm, setPageForm] = useState(pageDefaults);
  const [selectedNavId, setSelectedNavId] = useState('');

  const navItems = navigation.data ?? [];
  const selectedNav = navItems.find((item) => idOf(item) === selectedNavId) ?? navItems[0];
  const columns = useMemo(() => selectedNav?.columns ?? [], [selectedNav]);
  const collectionCards = useMemo(() => selectedNav?.collectionCards ?? [], [selectedNav]);

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'navigation'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'page-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] })
    ]);
  };

  const run = async (task: () => Promise<void>, message: string): Promise<void> => {
    try {
      await task();
      await invalidate();
      setToast({ tone: 'success', message });
      window.setTimeout(() => setToast(null), 2600);
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Save failed' });
    }
  };

  const editNav = (item: NavigationItemDto): void => {
    setEditingNav(item);
    setNavForm({ label: item.label, slug: item.slug, href: item.href, type: item.type, menuLayoutType: item.menuLayoutType ?? 'text-columns', sortOrder: item.sortOrder, isVisible: item.isVisible, isMegaMenuEnabled: item.isMegaMenuEnabled, isDefaultActive: item.isDefaultActive ?? false });
  };

  const saveNav = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...navForm, slug: navForm.slug || slugify(navForm.label) };
      if (editingNav) await api.put('/admin/navigation/' + idOf(editingNav), payload); else await api.post('/admin/navigation', payload);
      setEditingNav(null);
      setNavForm(navDefaults);
    }, 'Navigation saved.');
  };

  const saveColumn = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...columnForm, navItemId: editingColumn ? columnForm.navItemId : idOf(selectedNav ?? {}) };
      if (editingColumn) await api.put('/admin/mega-menu/columns/' + idOf(editingColumn), payload); else await api.post('/admin/mega-menu/columns', payload);
      setEditingColumn(null);
      setColumnForm({ ...columnDefaults, navItemId: idOf(selectedNav ?? {}) });
    }, 'Column saved.');
  };

  const saveLink = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...linkForm, linkedId: linkForm.linkedId.trim() || null, columnId: linkForm.columnId || idOf(columns[0] ?? {}) };
      if (editingLink) await api.put('/admin/mega-menu/links/' + idOf(editingLink), payload); else await api.post('/admin/mega-menu/links', payload);
      setEditingLink(null);
      setLinkForm({ ...linkDefaults, columnId: idOf(columns[0] ?? {}) });
    }, 'Menu link saved.');
  };

  const editColumn = (column: MegaMenuColumnDto): void => {
    setEditingColumn(column);
    setColumnForm({ navItemId: column.navItemId, title: column.title, sortOrder: column.sortOrder, isVisible: column.isVisible });
  };

  const editLink = (link: MegaMenuLinkDto): void => {
    setEditingLink(link);
    setLinkForm({ columnId: link.columnId, label: link.label, href: link.href, linkedType: link.linkedType, linkedId: link.linkedId ?? '', sortOrder: link.sortOrder, isVisible: link.isVisible, isHighlighted: link.isHighlighted, showArrow: link.showArrow ?? false });
  };

  const editCard = (card: MegaMenuCollectionCardDto): void => {
    setEditingCard(card);
    setCardForm({
      navItemId: card.navItemId,
      collectionId: referenceId(card.collectionId),
      titleOverride: card.titleOverride ?? '',
      slugOverride: card.slugOverride ?? '',
      imageOverride: card.imageOverride ?? '',
      mobileImageOverride: card.mobileImageOverride ?? '',
      sortOrder: card.sortOrder,
      isVisible: card.isVisible
    });
  };

  const saveCard = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...cardForm, navItemId: cardForm.navItemId || idOf(selectedNav ?? {}), collectionId: cardForm.collectionId.trim() || null };
      if (editingCard) await api.put('/admin/mega-menu/collection-cards/' + idOf(editingCard), payload); else await api.post('/admin/mega-menu/collection-cards', payload);
      setEditingCard(null);
      setCardForm({ ...cardDefaults, navItemId: idOf(selectedNav ?? {}) });
    }, 'Collection card saved.');
  };

  const editPromo = (promo: MegaMenuPromoDto | null | undefined): void => {
    setEditingPromo(promo ?? null);
    setPromoForm({
      navItemId: promo?.navItemId ?? idOf(selectedNav ?? {}),
      eyebrow: promo?.eyebrow ?? '',
      title: promo?.title ?? '',
      subtitle: promo?.subtitle ?? '',
      image: promo?.image ?? '',
      mobileImage: promo?.mobileImage ?? '',
      buttonLabel: promo?.buttonLabel ?? '',
      buttonHref: promo?.buttonHref ?? '',
      overlayOpacity: promo?.overlayOpacity ?? 0.5,
      showOnDesktop: promo?.showOnDesktop ?? true,
      showOnMobile: promo?.showOnMobile ?? true,
      isVisible: promo?.isVisible ?? true
    });
  };

  const savePromo = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...promoForm, navItemId: promoForm.navItemId || idOf(selectedNav ?? {}) };
      if (editingPromo) await api.put('/admin/mega-menu/promos/' + idOf(editingPromo), payload); else await api.post('/admin/mega-menu/promos', payload);
      setEditingPromo(null);
      setPromoForm({ ...promoDefaults, navItemId: idOf(selectedNav ?? {}) });
    }, 'Promo panel saved.');
  };

  const editCollection = (collection: CollectionDto): void => {
    setEditingCollection(collection);
    setCollectionForm({ title: collection.title, slug: collection.slug, description: collection.description ?? '', heroTitle: collection.heroTitle ?? '', heroSubtitle: collection.heroSubtitle ?? '', heroImage: collection.heroImage ?? '', mobileHeroImage: collection.mobileHeroImage ?? '', cardImage: collection.cardImage ?? '', thumbnailImage: collection.thumbnailImage ?? '', bannerImage: collection.bannerImage ?? '', mobileBannerImage: collection.mobileBannerImage ?? '', mobileImage: collection.mobileImage ?? '', collectionVideo: collection.collectionVideo ?? '', mobileCollectionVideo: collection.mobileCollectionVideo ?? '', backgroundVideo: collection.backgroundVideo ?? '', videoPosterImage: collection.videoPosterImage ?? '', imageAltText: collection.imageAltText ?? '', isBannerVisible: collection.isBannerVisible ?? false, productIds: referencesToCsv(collection.productIds), categoryIds: referencesToCsv(collection.categoryIds), productSortOrder: JSON.stringify(collection.productSortOrder ?? {}), sortOrder: collection.sortOrder, isVisible: collection.isVisible, isPublished: collection.isPublished ?? true, isFeatured: collection.isFeatured, showInMenu: collection.showInMenu ?? true, menuCardImage: collection.menuCardImage ?? '', mobileMenuCardImage: collection.mobileMenuCardImage ?? '', menuCardTitleOverride: collection.menuCardTitleOverride ?? '', menuCardOrder: collection.menuCardOrder ?? 0, defaultSort: collection.defaultSort ?? 'newest', defaultGridView: collection.defaultGridView ?? 4, areFiltersVisible: collection.areFiltersVisible ?? true, isAdvancedFilterEnabled: collection.isAdvancedFilterEnabled ?? true, isFlashlightEnabled: collection.isFlashlightEnabled ?? true, seoTitle: collection.seoTitle ?? '', seoDescription: collection.seoDescription ?? '', ogImage: collection.ogImage ?? '', tags: (collection.tags ?? []).join(', ') });
  };

  const saveCollection = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...collectionForm, slug: collectionForm.slug || slugify(collectionForm.title), tags: csvToIds(collectionForm.tags), productIds: csvToIds(collectionForm.productIds), categoryIds: csvToIds(collectionForm.categoryIds), productSortOrder: collectionForm.productSortOrder.trim() ? JSON.parse(collectionForm.productSortOrder) as Record<string, unknown> : {} };
      if (editingCollection) await api.put('/admin/collections/' + idOf(editingCollection), payload); else await api.post('/admin/collections', payload);
      setEditingCollection(null);
      setCollectionForm(collectionDefaults);
    }, 'Collection saved.');
  };

  const editTag = (tag: TagDto): void => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, slug: tag.slug, sortOrder: tag.sortOrder, isVisible: tag.isVisible });
  };

  const saveTag = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      const payload = { ...tagForm, slug: tagForm.slug || slugify(tagForm.name) };
      if (editingTag) await api.put('/admin/tags/' + idOf(editingTag), payload); else await api.post('/admin/tags', payload);
      setEditingTag(null);
      setTagForm(tagDefaults);
    }, 'Filter chip saved.');
  };

  const editPage = (page: PageSettingsDto): void => {
    setEditingPage(page);
    setPageForm({ pageType: page.pageType, pageSlug: page.pageSlug, title: page.title, subtitle: page.subtitle ?? '', heroImage: page.heroImage ?? '', mobileHeroImage: page.mobileHeroImage ?? '', heroVideo: page.heroVideo ?? '', mobileHeroVideo: page.mobileHeroVideo ?? '', bannerImage: page.bannerImage ?? '', mobileBannerImage: page.mobileBannerImage ?? '', bannerVideo: page.bannerVideo ?? '', mobileBannerVideo: page.mobileBannerVideo ?? '', videoPosterImage: page.videoPosterImage ?? '', ctaText: page.ctaText ?? '', ctaLink: page.ctaLink ?? '', isBannerVisible: Boolean(page.isBannerVisible), defaultSort: page.defaultSort ?? 'newest', defaultGridView: page.defaultGridView ?? 4, areFiltersVisible: page.areFiltersVisible ?? true, isAdvancedFilterEnabled: page.isAdvancedFilterEnabled ?? true, isFlashlightEnabled: page.isFlashlightEnabled ?? true, seoTitle: page.seoTitle ?? '', seoDescription: page.seoDescription ?? '', ogImage: page.ogImage ?? '', isPublished: page.isPublished ?? true });
  };

  const savePage = (event: FormEvent): void => {
    event.preventDefault();
    void run(async () => {
      if (editingPage) await api.put('/admin/page-settings/' + idOf(editingPage), pageForm); else await api.post('/admin/page-settings', pageForm);
      setEditingPage(null);
      setPageForm(pageDefaults);
    }, 'Page settings saved.');
  };

  const saveSite = (patch: Record<string, unknown>): void => {
    void run(async () => {
      await api.put('/admin/site-settings', { ...site.data, ...patch });
    }, 'Site settings saved.');
  };

  return <section className="grid gap-5">
    {toast ? <div className={(toast.tone === 'success' ? 'border-success text-success' : 'border-danger text-danger') + ' fixed right-5 top-5 z-50 border bg-background-elevated px-4 py-3 text-sm shadow-lg'}>{toast.tone === 'success' ? <Check size={14} className="mr-2 inline" /> : null}{toast.message}</div> : null}
    <div className="flex gap-2 overflow-x-auto border border-border bg-background-elevated p-2">
      {[
        ['navigation', 'Navigation', Layers3],
        ['mega-menu', 'Mega Menu', Columns3],
        ['collections', 'Collections', Archive],
        ['filters', 'Filters', Tags],
        ['pages', 'Pages', Pencil],
        ['settings', 'Settings', Settings]
      ].map(([key, label, Icon]) => <button key={String(key)} type="button" onClick={() => setTab(key as Tab)} className={(tab === key ? 'border-accent-gold text-accent-gold' : 'border-transparent text-text-secondary hover:text-text-primary') + ' inline-flex h-11 shrink-0 items-center gap-2 border px-3 text-xs uppercase tracking-[0.12em] transition'}><Icon size={15} />{String(label)}</button>)}
    </div>
    {tab === 'navigation' ? <NavigationPanel navItems={navItems} form={navForm} setForm={setNavForm} editing={editingNav} onCancel={() => { setEditingNav(null); setNavForm(navDefaults); }} onEdit={editNav} onSubmit={saveNav} onDelete={(item) => void run(async () => { await api.delete('/admin/navigation/' + idOf(item)); }, 'Navigation deleted.')} /> : null}
    {tab === 'mega-menu' ? <MegaMenuPanel navItems={navItems} selectedNav={selectedNav} selectedNavId={idOf(selectedNav ?? {})} setSelectedNavId={setSelectedNavId} columns={columns} collectionCards={collectionCards} collections={collections.data ?? []} columnForm={columnForm} setColumnForm={setColumnForm} editingColumn={editingColumn} onCancelColumn={() => { setEditingColumn(null); setColumnForm({ ...columnDefaults, navItemId: idOf(selectedNav ?? {}) }); }} onEditColumn={editColumn} linkForm={linkForm} setLinkForm={setLinkForm} editingLink={editingLink} onCancelLink={() => { setEditingLink(null); setLinkForm({ ...linkDefaults, columnId: idOf(columns[0] ?? {}) }); }} onEditLink={editLink} cardForm={cardForm} setCardForm={setCardForm} editingCard={editingCard} onCancelCard={() => { setEditingCard(null); setCardForm({ ...cardDefaults, navItemId: idOf(selectedNav ?? {}) }); }} onEditCard={editCard} onCardSubmit={saveCard} promoForm={promoForm} setPromoForm={setPromoForm} editingPromo={editingPromo} onEditPromo={editPromo} onPromoSubmit={savePromo} onColumnSubmit={saveColumn} onLinkSubmit={saveLink} onDeleteColumn={(column) => void run(async () => { await api.delete('/admin/mega-menu/columns/' + idOf(column)); }, 'Column deleted.')} onDeleteLink={(link) => void run(async () => { await api.delete('/admin/mega-menu/links/' + idOf(link)); }, 'Link deleted.')} onDeleteCard={(card) => void run(async () => { await api.delete('/admin/mega-menu/collection-cards/' + idOf(card)); }, 'Collection card deleted.')} onDeletePromo={(promo) => void run(async () => { await api.delete('/admin/mega-menu/promos/' + idOf(promo)); }, 'Promo deleted.')} /> : null}
    {tab === 'collections' ? <CollectionsPanel collections={collections.data ?? []} form={collectionForm} setForm={setCollectionForm} editing={editingCollection} onCancel={() => { setEditingCollection(null); setCollectionForm(collectionDefaults); }} onEdit={editCollection} onSubmit={saveCollection} onDelete={(collection) => void run(async () => { await api.delete('/admin/collections/' + idOf(collection)); }, 'Collection hidden.')} /> : null}
    {tab === 'filters' ? <TagsPanel tags={tags.data ?? []} form={tagForm} setForm={setTagForm} editing={editingTag} onCancel={() => { setEditingTag(null); setTagForm(tagDefaults); }} onEdit={editTag} onSubmit={saveTag} onDelete={(tag) => void run(async () => { await api.delete('/admin/tags/' + idOf(tag)); }, 'Filter chip hidden.')} /> : null}
    {tab === 'pages' ? <PagesPanel pages={pages.data ?? []} form={pageForm} setForm={setPageForm} editing={editingPage} onCancel={() => { setEditingPage(null); setPageForm(pageDefaults); }} onEdit={editPage} onSubmit={savePage} /> : null}
    {tab === 'settings' ? <SettingsPanel site={site.data} onSave={saveSite} /> : null}
  </section>;
}

function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }): ReactNode {
  return <section className="grid gap-5 border border-border bg-background-elevated p-5 shadow-lg"><div><h2 className="font-display text-2xl text-text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></div>{children}</section>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactNode {
  return <label className="flex min-h-11 items-center gap-3 border border-border px-3 text-sm text-text-secondary"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent-gold" />{label}</label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: ReactNode }): ReactNode {
  return <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm normal-case text-text-primary">{children}</select></label>;
}

function NavigationPanel({ navItems, form, setForm, editing, onCancel, onEdit, onSubmit, onDelete }: { navItems: NavigationItemDto[]; form: typeof navDefaults; setForm: (form: typeof navDefaults) => void; editing: NavigationItemDto | null; onCancel: () => void; onEdit: (item: NavigationItemDto) => void; onSubmit: (event: FormEvent) => void; onDelete: (item: NavigationItemDto) => void }): ReactNode {
  return <Panel title="Header Navigation Manager" body="Create, hide, reorder, and route the primary storefront navigation. Mega-menu content is built in the next tab.">
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      <Input label="Label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value, slug: form.slug || slugify(event.target.value) })} />
      <Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
      <Input label="Href" value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} />
      <Select label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value as typeof navDefaults.type })}>{navTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
      <Select label="Menu Layout" value={form.menuLayoutType} onChange={(value) => setForm({ ...form, menuLayoutType: value as typeof navDefaults.menuLayoutType })}>{layoutTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
      <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
      <div className="grid gap-2"><Toggle label="Visible" value={form.isVisible} onChange={(value) => setForm({ ...form, isVisible: value })} /><Toggle label="Mega menu" value={form.isMegaMenuEnabled} onChange={(value) => setForm({ ...form, isMegaMenuEnabled: value })} /><Toggle label="Default active" value={form.isDefaultActive} onChange={(value) => setForm({ ...form, isDefaultActive: value })} /></div>
      <div className="flex gap-3 md:col-span-3"><Button type="submit"><Save size={15} />{editing ? 'Save Navigation' : 'Add Navigation'}</Button>{editing ? <Button type="button" variant="secondary" onClick={onCancel}><X size={15} />Cancel</Button> : null}</div>
    </form>
    {navItems.length === 0 ? <EmptyPanel title="No navigation" message="Create the first header item to begin." /> : <Rows items={navItems.map((item) => ({ id: idOf(item), title: item.label, meta: item.href, active: item.isVisible, onEdit: () => onEdit(item), onDelete: () => onDelete(item) }))} />}
  </Panel>;
}

function MegaMenuPanel({
  navItems,
  selectedNav,
  selectedNavId,
  setSelectedNavId,
  columns,
  collectionCards,
  collections,
  columnForm,
  setColumnForm,
  editingColumn,
  onCancelColumn,
  onEditColumn,
  linkForm,
  setLinkForm,
  editingLink,
  onCancelLink,
  onEditLink,
  cardForm,
  setCardForm,
  editingCard,
  onCancelCard,
  onEditCard,
  onCardSubmit,
  promoForm,
  setPromoForm,
  editingPromo,
  onEditPromo,
  onPromoSubmit,
  onColumnSubmit,
  onLinkSubmit,
  onDeleteColumn,
  onDeleteLink,
  onDeleteCard,
  onDeletePromo
}: {
  navItems: NavigationItemDto[];
  selectedNav?: NavigationItemDto;
  selectedNavId: string;
  setSelectedNavId: (id: string) => void;
  columns: MegaMenuColumnDto[];
  collectionCards: MegaMenuCollectionCardDto[];
  collections: CollectionDto[];
  columnForm: typeof columnDefaults;
  setColumnForm: (form: typeof columnDefaults) => void;
  editingColumn: MegaMenuColumnDto | null;
  onCancelColumn: () => void;
  onEditColumn: (column: MegaMenuColumnDto) => void;
  linkForm: typeof linkDefaults;
  setLinkForm: (form: typeof linkDefaults) => void;
  editingLink: MegaMenuLinkDto | null;
  onCancelLink: () => void;
  onEditLink: (link: MegaMenuLinkDto) => void;
  cardForm: typeof cardDefaults;
  setCardForm: (form: typeof cardDefaults) => void;
  editingCard: MegaMenuCollectionCardDto | null;
  onCancelCard: () => void;
  onEditCard: (card: MegaMenuCollectionCardDto) => void;
  onCardSubmit: (event: FormEvent) => void;
  promoForm: typeof promoDefaults;
  setPromoForm: (form: typeof promoDefaults) => void;
  editingPromo: MegaMenuPromoDto | null;
  onEditPromo: (promo: MegaMenuPromoDto | null | undefined) => void;
  onPromoSubmit: (event: FormEvent) => void;
  onColumnSubmit: (event: FormEvent) => void;
  onLinkSubmit: (event: FormEvent) => void;
  onDeleteColumn: (column: MegaMenuColumnDto) => void;
  onDeleteLink: (link: MegaMenuLinkDto) => void;
  onDeleteCard: (card: MegaMenuCollectionCardDto) => void;
  onDeletePromo: (promo: MegaMenuPromoDto) => void;
}): ReactNode {
  const firstColumnId = idOf(columns[0] ?? {});
  const linkColumnValue = linkForm.columnId || firstColumnId;
  return <Panel title="Mega Menu Builder" body="Add columns and touch-friendly menu links under each header item.">
    <Select label="Navigation Item" value={selectedNavId} onChange={setSelectedNavId}>{navItems.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.label}</option>)}</Select>
    <div className="grid gap-2 border border-border bg-background-primary p-4 text-sm text-text-secondary md:grid-cols-3">
      <p><span className="text-text-muted">Layout:</span> {selectedNav?.menuLayoutType ?? 'text-columns'}</p>
      <p><span className="text-text-muted">Promo:</span> {selectedNav?.promo?.isVisible ? 'Visible' : selectedNav?.promo ? 'Hidden' : 'Not set'}</p>
      <p><span className="text-text-muted">Cards:</span> {collectionCards.length}</p>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={onColumnSubmit} className="grid gap-4 border border-border bg-background-primary p-4">
        <h3 className="font-display text-xl">{editingColumn ? 'Edit Column' : 'Column'}</h3>
        <Input label="Title" value={columnForm.title} onChange={(event) => setColumnForm({ ...columnForm, title: event.target.value, navItemId: columnForm.navItemId || selectedNavId })} />
        <Input label="Sort Order" type="number" value={columnForm.sortOrder} onChange={(event) => setColumnForm({ ...columnForm, sortOrder: Number(event.target.value), navItemId: columnForm.navItemId || selectedNavId })} />
        <Toggle label="Visible" value={columnForm.isVisible} onChange={(value) => setColumnForm({ ...columnForm, isVisible: value, navItemId: columnForm.navItemId || selectedNavId })} />
        <div className="flex gap-3">
          <Button type="submit"><Save size={15} />{editingColumn ? 'Save Column' : 'Add Column'}</Button>
          {editingColumn ? <Button type="button" variant="secondary" onClick={onCancelColumn}><X size={15} />Cancel</Button> : null}
        </div>
      </form>
      <form onSubmit={onLinkSubmit} className="grid gap-4 border border-border bg-background-primary p-4">
        <h3 className="font-display text-xl">{editingLink ? 'Edit Link' : 'Link'}</h3>
        <Select label="Column" value={linkColumnValue} onChange={(value) => setLinkForm({ ...linkForm, columnId: value })}>{columns.map((column) => <option key={idOf(column)} value={idOf(column)}>{column.title}</option>)}</Select>
        <Input label="Label" value={linkForm.label} onChange={(event) => setLinkForm({ ...linkForm, label: event.target.value })} />
        <Input label="Href" value={linkForm.href} onChange={(event) => setLinkForm({ ...linkForm, href: event.target.value })} />
        <Select label="Link Type" value={linkForm.linkedType} onChange={(value) => setLinkForm({ ...linkForm, linkedType: value as typeof linkDefaults.linkedType })}>{linkTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
        <Input label="Linked ID" value={linkForm.linkedId} onChange={(event) => setLinkForm({ ...linkForm, linkedId: event.target.value })} />
        <Input label="Sort Order" type="number" value={linkForm.sortOrder} onChange={(event) => setLinkForm({ ...linkForm, sortOrder: Number(event.target.value) })} />
        <div className="grid gap-2 sm:grid-cols-3"><Toggle label="Visible" value={linkForm.isVisible} onChange={(value) => setLinkForm({ ...linkForm, isVisible: value })} /><Toggle label="Highlighted" value={linkForm.isHighlighted} onChange={(value) => setLinkForm({ ...linkForm, isHighlighted: value })} /><Toggle label="Show arrow" value={linkForm.showArrow} onChange={(value) => setLinkForm({ ...linkForm, showArrow: value })} /></div>
        <div className="flex gap-3">
          <Button type="submit"><Save size={15} />{editingLink ? 'Save Link' : 'Add Link'}</Button>
          {editingLink ? <Button type="button" variant="secondary" onClick={onCancelLink}><X size={15} />Cancel</Button> : null}
        </div>
      </form>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => <section key={idOf(column)} className="border border-border bg-background-primary p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">{column.title}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">{column.isVisible ? 'Visible' : 'Hidden'} - {column.links.length} links</p>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Edit column" onClick={() => onEditColumn(column)} className="grid h-9 w-9 place-items-center border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold"><Pencil size={14} /></button>
            <button type="button" aria-label="Delete column" onClick={() => onDeleteColumn(column)} className="grid h-9 w-9 place-items-center border border-border text-text-secondary hover:border-danger hover:text-danger"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {column.links.map((link) => <div key={idOf(link)} className="grid gap-2 border border-border-subtle px-3 py-2 text-sm text-text-secondary">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-text-primary">{link.label}</p>
                <p className="truncate text-xs text-text-muted">{link.href}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" aria-label="Edit link" onClick={() => onEditLink(link)} className="text-text-muted hover:text-accent-gold"><Pencil size={14} /></button>
                <button type="button" aria-label="Delete link" onClick={() => onDeleteLink(link)} className="text-text-muted hover:text-danger"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{link.isVisible ? 'Visible' : 'Hidden'}{link.isHighlighted ? ' - Highlighted' : ''}</p>
          </div>)}
        </div>
      </section>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={onCardSubmit} className="grid gap-4 border border-border bg-background-primary p-4">
        <h3 className="font-display text-xl">{editingCard ? 'Edit Collection Card' : 'Collection Card'}</h3>
        <Select label="Collection" value={cardForm.collectionId} onChange={(value) => setCardForm({ ...cardForm, collectionId: value, navItemId: cardForm.navItemId || selectedNavId })}>
          <option value="">Custom / no collection reference</option>
          {collections.map((collection) => <option key={idOf(collection)} value={idOf(collection)}>{collection.title}</option>)}
        </Select>
        <Input label="Title Override" value={cardForm.titleOverride} onChange={(event) => setCardForm({ ...cardForm, titleOverride: event.target.value, navItemId: cardForm.navItemId || selectedNavId })} />
        <Input label="Slug Override" value={cardForm.slugOverride} onChange={(event) => setCardForm({ ...cardForm, slugOverride: event.target.value, navItemId: cardForm.navItemId || selectedNavId })} />
        <Input label="Card Image Override" value={cardForm.imageOverride} onChange={(event) => setCardForm({ ...cardForm, imageOverride: event.target.value, navItemId: cardForm.navItemId || selectedNavId })} />
        <Input label="Mobile Image Override" value={cardForm.mobileImageOverride} onChange={(event) => setCardForm({ ...cardForm, mobileImageOverride: event.target.value, navItemId: cardForm.navItemId || selectedNavId })} />
        <Input label="Sort Order" type="number" value={cardForm.sortOrder} onChange={(event) => setCardForm({ ...cardForm, sortOrder: Number(event.target.value), navItemId: cardForm.navItemId || selectedNavId })} />
        <Toggle label="Visible" value={cardForm.isVisible} onChange={(value) => setCardForm({ ...cardForm, isVisible: value, navItemId: cardForm.navItemId || selectedNavId })} />
        <div className="flex gap-3">
          <Button type="submit"><Save size={15} />{editingCard ? 'Save Card' : 'Add Card'}</Button>
          {editingCard ? <Button type="button" variant="secondary" onClick={onCancelCard}><X size={15} />Cancel</Button> : null}
        </div>
      </form>
      <form onSubmit={onPromoSubmit} className="grid gap-4 border border-border bg-background-primary p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl">{editingPromo ? 'Edit Promo Panel' : 'Promo Panel'}</h3>
          <Button type="button" variant="secondary" onClick={() => onEditPromo(selectedNav?.promo)}><Pencil size={15} />Load Current</Button>
        </div>
        <Input label="Eyebrow" value={promoForm.eyebrow} onChange={(event) => setPromoForm({ ...promoForm, eyebrow: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Title" value={promoForm.title} onChange={(event) => setPromoForm({ ...promoForm, title: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Subtitle" value={promoForm.subtitle} onChange={(event) => setPromoForm({ ...promoForm, subtitle: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Desktop Image" value={promoForm.image} onChange={(event) => setPromoForm({ ...promoForm, image: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Mobile Image" value={promoForm.mobileImage} onChange={(event) => setPromoForm({ ...promoForm, mobileImage: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Button Label" value={promoForm.buttonLabel} onChange={(event) => setPromoForm({ ...promoForm, buttonLabel: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Button Href" value={promoForm.buttonHref} onChange={(event) => setPromoForm({ ...promoForm, buttonHref: event.target.value, navItemId: promoForm.navItemId || selectedNavId })} />
        <Input label="Overlay Opacity" type="number" value={promoForm.overlayOpacity} onChange={(event) => setPromoForm({ ...promoForm, overlayOpacity: Number(event.target.value), navItemId: promoForm.navItemId || selectedNavId })} />
        <div className="grid gap-2 sm:grid-cols-3"><Toggle label="Visible" value={promoForm.isVisible} onChange={(value) => setPromoForm({ ...promoForm, isVisible: value, navItemId: promoForm.navItemId || selectedNavId })} /><Toggle label="Desktop" value={promoForm.showOnDesktop} onChange={(value) => setPromoForm({ ...promoForm, showOnDesktop: value, navItemId: promoForm.navItemId || selectedNavId })} /><Toggle label="Mobile" value={promoForm.showOnMobile} onChange={(value) => setPromoForm({ ...promoForm, showOnMobile: value, navItemId: promoForm.navItemId || selectedNavId })} /></div>
        <div className="flex gap-3">
          <Button type="submit"><Save size={15} />Save Promo</Button>
          {selectedNav?.promo ? <Button type="button" variant="secondary" onClick={() => onDeletePromo(selectedNav.promo as MegaMenuPromoDto)}><Trash2 size={15} />Delete</Button> : null}
        </div>
      </form>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {collectionCards.map((card) => {
        const collection = typeof card.collectionId === 'object' && card.collectionId ? card.collectionId : null;
        return <section key={idOf(card)} className="border border-border bg-background-primary p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl">{card.titleOverride || collection?.title || 'Custom collection card'}</h3>
              <p className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-text-muted">{card.isVisible ? 'Visible' : 'Hidden'} - {card.slugOverride || collection?.slug || 'custom'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" aria-label="Edit card" onClick={() => onEditCard(card)} className="grid h-9 w-9 place-items-center border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold"><Pencil size={14} /></button>
              <button type="button" aria-label="Delete card" onClick={() => onDeleteCard(card)} className="grid h-9 w-9 place-items-center border border-border text-text-secondary hover:border-danger hover:text-danger"><Trash2 size={14} /></button>
            </div>
          </div>
        </section>;
      })}
    </div>
  </Panel>;
}

function CollectionsPanel({ collections, form, setForm, editing, onCancel, onEdit, onSubmit, onDelete }: { collections: CollectionDto[]; form: typeof collectionDefaults; setForm: (form: typeof collectionDefaults) => void; editing: CollectionDto | null; onCancel: () => void; onEdit: (collection: CollectionDto) => void; onSubmit: (event: FormEvent) => void; onDelete: (collection: CollectionDto) => void }): ReactNode {
  return <Panel title="Collection Manager" body="Control collection cards, landing pages, SEO, and product browsing groups.">
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: form.slug || slugify(event.target.value) })} />
      <Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
      <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
      <Input label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Input label="Hero Title" value={form.heroTitle} onChange={(event) => setForm({ ...form, heroTitle: event.target.value })} />
      <Input label="Hero Subtitle" value={form.heroSubtitle} onChange={(event) => setForm({ ...form, heroSubtitle: event.target.value })} />
      <Input label="Hero Image" value={form.heroImage} onChange={(event) => setForm({ ...form, heroImage: event.target.value })} />
      <Input label="Mobile Hero Image" value={form.mobileHeroImage} onChange={(event) => setForm({ ...form, mobileHeroImage: event.target.value })} />
      <Input label="Card Image" value={form.cardImage} onChange={(event) => setForm({ ...form, cardImage: event.target.value })} />
      <Input label="Thumbnail Image" value={form.thumbnailImage} onChange={(event) => setForm({ ...form, thumbnailImage: event.target.value })} />
      <Input label="Banner Image" value={form.bannerImage} onChange={(event) => setForm({ ...form, bannerImage: event.target.value })} />
      <Input label="Mobile Banner Image" value={form.mobileBannerImage} onChange={(event) => setForm({ ...form, mobileBannerImage: event.target.value })} />
      <Input label="Mobile Image" value={form.mobileImage} onChange={(event) => setForm({ ...form, mobileImage: event.target.value })} />
      <Input label="Collection Video" value={form.collectionVideo} onChange={(event) => setForm({ ...form, collectionVideo: event.target.value })} />
      <Input label="Mobile Collection Video" value={form.mobileCollectionVideo} onChange={(event) => setForm({ ...form, mobileCollectionVideo: event.target.value })} />
      <Input label="Background Video" value={form.backgroundVideo} onChange={(event) => setForm({ ...form, backgroundVideo: event.target.value })} />
      <Input label="Video Poster" value={form.videoPosterImage} onChange={(event) => setForm({ ...form, videoPosterImage: event.target.value })} />
      <Input label="Image Alt Text" value={form.imageAltText} onChange={(event) => setForm({ ...form, imageAltText: event.target.value })} />
      <Input label="Menu Card Image" value={form.menuCardImage} onChange={(event) => setForm({ ...form, menuCardImage: event.target.value })} />
      <Input label="Mobile Menu Card Image" value={form.mobileMenuCardImage} onChange={(event) => setForm({ ...form, mobileMenuCardImage: event.target.value })} />
      <Input label="Menu Title Override" value={form.menuCardTitleOverride} onChange={(event) => setForm({ ...form, menuCardTitleOverride: event.target.value })} />
      <Input label="Menu Card Order" type="number" value={form.menuCardOrder} onChange={(event) => setForm({ ...form, menuCardOrder: Number(event.target.value) })} />
      <Input label="Tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
      <Input label="Product IDs" value={form.productIds} onChange={(event) => setForm({ ...form, productIds: event.target.value })} />
      <Input label="Category IDs" value={form.categoryIds} onChange={(event) => setForm({ ...form, categoryIds: event.target.value })} />
      <Input label="Product Sort JSON" value={form.productSortOrder} onChange={(event) => setForm({ ...form, productSortOrder: event.target.value })} />
      <Select label="Default Sort" value={form.defaultSort} onChange={(value) => setForm({ ...form, defaultSort: value as typeof collectionDefaults.defaultSort })}>{sortOptions.map((sort) => <option key={sort} value={sort}>{sort}</option>)}</Select>
      <Select label="Default Grid" value={form.defaultGridView} onChange={(value) => setForm({ ...form, defaultGridView: Number(value) as typeof collectionDefaults.defaultGridView })}>{gridOptions.map((grid) => <option key={grid} value={grid}>{grid}-grid</option>)}</Select>
      <Input label="SEO Title" value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} />
      <Input label="SEO Description" value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} />
      <Input label="OG Image" value={form.ogImage} onChange={(event) => setForm({ ...form, ogImage: event.target.value })} />
      <div className="grid gap-2"><Toggle label="Visible" value={form.isVisible} onChange={(value) => setForm({ ...form, isVisible: value })} /><Toggle label="Published" value={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value })} /><Toggle label="Featured" value={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} /><Toggle label="Show in menu" value={form.showInMenu} onChange={(value) => setForm({ ...form, showInMenu: value })} /><Toggle label="Banner visible" value={form.isBannerVisible} onChange={(value) => setForm({ ...form, isBannerVisible: value })} /><Toggle label="Filters" value={form.areFiltersVisible} onChange={(value) => setForm({ ...form, areFiltersVisible: value })} /><Toggle label="Advanced filters" value={form.isAdvancedFilterEnabled} onChange={(value) => setForm({ ...form, isAdvancedFilterEnabled: value })} /><Toggle label="Flashlight" value={form.isFlashlightEnabled} onChange={(value) => setForm({ ...form, isFlashlightEnabled: value })} /></div>
      <div className="flex gap-3 md:col-span-3"><Button type="submit"><Save size={15} />{editing ? 'Save Collection' : 'Add Collection'}</Button>{editing ? <Button type="button" variant="secondary" onClick={onCancel}><X size={15} />Cancel</Button> : null}</div>
    </form>
    <Rows items={collections.map((collection) => ({ id: idOf(collection), title: collection.title, meta: '/collections/' + collection.slug, active: collection.isVisible, onEdit: () => onEdit(collection), onDelete: () => onDelete(collection) }))} />
  </Panel>;
}

function TagsPanel({ tags, form, setForm, editing, onCancel, onEdit, onSubmit, onDelete }: { tags: TagDto[]; form: typeof tagDefaults; setForm: (form: typeof tagDefaults) => void; editing: TagDto | null; onCancel: () => void; onEdit: (tag: TagDto) => void; onSubmit: (event: FormEvent) => void; onDelete: (tag: TagDto) => void }): ReactNode {
  return <Panel title="Filter Chip Manager" body="Manage the horizontal storefront filter chips used by collection and listing pages.">
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4">
      <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: form.slug || slugify(event.target.value) })} />
      <Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
      <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
      <Toggle label="Visible" value={form.isVisible} onChange={(value) => setForm({ ...form, isVisible: value })} />
      <div className="flex gap-3 md:col-span-4"><Button type="submit"><Save size={15} />{editing ? 'Save Chip' : 'Add Chip'}</Button>{editing ? <Button type="button" variant="secondary" onClick={onCancel}><X size={15} />Cancel</Button> : null}</div>
    </form>
    <Rows items={tags.map((tag) => ({ id: idOf(tag), title: tag.name, meta: tag.slug, active: tag.isVisible, onEdit: () => onEdit(tag), onDelete: () => onDelete(tag) }))} />
  </Panel>;
}

function PagesPanel({ pages, form, setForm, editing, onCancel, onEdit, onSubmit }: { pages: PageSettingsDto[]; form: typeof pageDefaults; setForm: (form: typeof pageDefaults) => void; editing: PageSettingsDto | null; onCancel: () => void; onEdit: (page: PageSettingsDto) => void; onSubmit: (event: FormEvent) => void }): ReactNode {
  return <Panel title="Page Settings" body="Control titles, heroes, filters, grid defaults, flashlight visibility, and SEO for storefront pages.">
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      <Input label="Page Type" value={form.pageType} onChange={(event) => setForm({ ...form, pageType: event.target.value })} />
      <Input label="Page Slug" value={form.pageSlug} onChange={(event) => setForm({ ...form, pageSlug: event.target.value })} />
      <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      <Input label="Subtitle" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
      <Input label="Hero Image" value={form.heroImage} onChange={(event) => setForm({ ...form, heroImage: event.target.value })} />
      <Input label="Mobile Hero" value={form.mobileHeroImage} onChange={(event) => setForm({ ...form, mobileHeroImage: event.target.value })} />
      <Input label="Hero Video" value={form.heroVideo} onChange={(event) => setForm({ ...form, heroVideo: event.target.value })} />
      <Input label="Mobile Hero Video" value={form.mobileHeroVideo} onChange={(event) => setForm({ ...form, mobileHeroVideo: event.target.value })} />
      <Input label="Banner Image" value={form.bannerImage} onChange={(event) => setForm({ ...form, bannerImage: event.target.value })} />
      <Input label="Mobile Banner Image" value={form.mobileBannerImage} onChange={(event) => setForm({ ...form, mobileBannerImage: event.target.value })} />
      <Input label="Banner Video" value={form.bannerVideo} onChange={(event) => setForm({ ...form, bannerVideo: event.target.value })} />
      <Input label="Mobile Banner Video" value={form.mobileBannerVideo} onChange={(event) => setForm({ ...form, mobileBannerVideo: event.target.value })} />
      <Input label="Video Poster" value={form.videoPosterImage} onChange={(event) => setForm({ ...form, videoPosterImage: event.target.value })} />
      <Input label="CTA Text" value={form.ctaText} onChange={(event) => setForm({ ...form, ctaText: event.target.value })} />
      <Input label="CTA Link" value={form.ctaLink} onChange={(event) => setForm({ ...form, ctaLink: event.target.value })} />
      <Select label="Default Sort" value={form.defaultSort} onChange={(value) => setForm({ ...form, defaultSort: value as typeof pageDefaults.defaultSort })}>{sortOptions.map((sort) => <option key={sort} value={sort}>{sort}</option>)}</Select>
      <Select label="Default Grid" value={form.defaultGridView} onChange={(value) => setForm({ ...form, defaultGridView: Number(value) as typeof pageDefaults.defaultGridView })}>{gridOptions.map((grid) => <option key={grid} value={grid}>{grid}-grid</option>)}</Select>
      <Input label="SEO Title" value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} />
      <Input label="SEO Description" value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} />
      <Input label="OG Image" value={form.ogImage} onChange={(event) => setForm({ ...form, ogImage: event.target.value })} />
      <div className="grid gap-2"><Toggle label="Published" value={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value })} /><Toggle label="Banner visible" value={form.isBannerVisible} onChange={(value) => setForm({ ...form, isBannerVisible: value })} /><Toggle label="Filters" value={form.areFiltersVisible} onChange={(value) => setForm({ ...form, areFiltersVisible: value })} /><Toggle label="Advanced Filters" value={form.isAdvancedFilterEnabled} onChange={(value) => setForm({ ...form, isAdvancedFilterEnabled: value })} /><Toggle label="Flashlight" value={form.isFlashlightEnabled} onChange={(value) => setForm({ ...form, isFlashlightEnabled: value })} /></div>
      <div className="flex gap-3 md:col-span-3"><Button type="submit"><Save size={15} />{editing ? 'Save Page' : 'Add Page'}</Button>{editing ? <Button type="button" variant="secondary" onClick={onCancel}><X size={15} />Cancel</Button> : null}</div>
    </form>
    <Rows items={pages.map((page) => ({ id: idOf(page), title: page.title, meta: page.pageType + '/' + page.pageSlug, active: page.isPublished ?? true, onEdit: () => onEdit(page) }))} />
  </Panel>;
}

function SettingsPanel({ site, onSave }: { site?: { defaultGridView: 1 | 2 | 4; isFlashlightEnabled: boolean; isCollectionCarouselEnabled: boolean; isAdvancedFilterEnabled: boolean; isStorefrontNavigationVisible: boolean }; onSave: (patch: Record<string, unknown>) => void }): ReactNode {
  if (!site) return <EmptyPanel title="Site settings" message="Loading global storefront settings." />;
  return <Panel title="Site Settings" body="Set global storefront defaults for browsing controls and feature visibility.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Select label="Default Grid" value={site.defaultGridView} onChange={(value) => onSave({ defaultGridView: Number(value) })}>{gridOptions.map((grid) => <option key={grid} value={grid}>{grid}-grid</option>)}</Select>
      <Toggle label="Flashlight enabled" value={site.isFlashlightEnabled} onChange={(value) => onSave({ isFlashlightEnabled: value })} />
      <Toggle label="Collection carousel" value={site.isCollectionCarouselEnabled} onChange={(value) => onSave({ isCollectionCarouselEnabled: value })} />
      <Toggle label="Advanced filters" value={site.isAdvancedFilterEnabled} onChange={(value) => onSave({ isAdvancedFilterEnabled: value })} />
      <Toggle label="Storefront navigation" value={site.isStorefrontNavigationVisible} onChange={(value) => onSave({ isStorefrontNavigationVisible: value })} />
    </div>
  </Panel>;
}

function Rows({ items }: { items: Array<{ id: string; title: string; meta: string; active?: boolean; onEdit?: () => void; onDelete?: () => void }> }): ReactNode {
  if (items.length === 0) return <EmptyPanel title="No records" message="Create an item to populate this manager." />;
  return <div className="overflow-x-auto border border-border bg-background-primary"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-muted"><tr><th className="border-b border-border p-4">Name</th><th className="border-b border-border p-4">Path</th><th className="border-b border-border p-4">Status</th><th className="border-b border-border p-4 text-right">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-border-subtle"><td className="p-4 text-text-primary">{item.title}</td><td className="p-4 text-text-secondary">{item.meta}</td><td className="p-4">{item.active ? <span className="inline-flex items-center gap-2 text-success"><Eye size={14} />Visible</span> : <span className="inline-flex items-center gap-2 text-text-muted"><EyeOff size={14} />Hidden</span>}</td><td className="p-4"><div className="flex justify-end gap-2">{item.onEdit ? <button type="button" aria-label="Edit" onClick={item.onEdit} className="grid h-10 w-10 place-items-center border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold"><Pencil size={15} /></button> : null}{item.onDelete ? <button type="button" aria-label="Delete" onClick={item.onDelete} className="grid h-10 w-10 place-items-center border border-border text-text-secondary hover:border-danger hover:text-danger"><Trash2 size={15} /></button> : null}</div></td></tr>)}</tbody></table></div>;
}
