// Governed by .rules v1.0
'use client';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { Archive, CalendarClock, Clock, Copy, Eye, GripVertical, History, LayoutTemplate, Monitor, Plus, Rocket, Save, Search, Smartphone, ToggleLeft, ToggleRight, Trash2, UploadCloud, X } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { createDefaultSectionInput, createHomepageTemplates, getSectionTemplate, sectionDtoToInput, SECTION_TEMPLATES, type ContentState, type HomepageTemplate, type SectionCategory, type SectionTemplate } from '@/components/cms/section-registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { COPY } from '@/constants/copy';
import { useArchiveCmsSection, useCmsUploadSignature, useCreateCmsMedia, useCreateCmsSection, usePublishCmsPage, useReorderCmsSections, useRestoreCmsVersion, useUpdateCmsSection, type CmsSectionInput } from '@/hooks/useAdminMutations';
import { useAdminCategories, useAdminCollections, useAdminProducts, useCmsMedia, useCmsPages, useCmsPageSections, useCmsVersions } from '@/hooks/useAdminResources';
import { externalUploadApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CategoryDto, CmsMediaDto, CmsPageDto, CmsSectionDto, CmsSectionType, CmsStatus, CollectionDto, ProductDto } from '@/types/dto.types';

export interface CmsBuilderProps { }

type DevicePreview = 'desktop' | 'tablet' | 'mobile';
type ContentValue = string | number | boolean;
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type TemplateAction = 'replace' | 'append';
type ToastState = { tone: 'success' | 'error' | 'info'; message: string } | null;
type WorkspaceTab = 'builder' | 'live-preview';
interface CloudinaryUploadResponse { secure_url?: string; }

const categories: Array<'All' | SectionCategory> = ['All', 'Hero', 'Products', 'Marketing', 'Editorial', 'Social', 'Utility'];
const quickFilters = ['Recommended', 'Most Used', 'New'] as const;
const statusOptions = [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' }];
const targetOptions = [{ label: 'Home', value: 'home' }, { label: 'Men landing page', value: 'men' }, { label: 'Women landing page', value: 'women' }, { label: 'Collection page', value: 'collection' }, { label: 'Sale page', value: 'sale' }, { label: 'Drop page', value: 'drop' }, { label: 'Custom landing page', value: 'custom' }];
const boolOptions = [{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }];

const sectionId = (section: CmsSectionDto): string => section.id ?? section._id ?? section.title;
const pageId = (page?: CmsPageDto): string | undefined => page?.id ?? page?._id;
const today = (): string => new Date().toISOString().slice(0, 10);
const nextMonth = (): string => { const date = new Date(); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 10); };
const isActive = (section: CmsSectionDto): boolean => section.active ?? section.isActive ?? false;
const scheduleLabel = (section: CmsSectionDto): string => section.startDate || section.endDate ? 'Scheduled' : 'Always on';
const contentValue = (value: unknown): ContentValue => typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' ? value : '';
const parseIds = (value: ContentValue | undefined): string[] => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
const itemId = (item: { id?: string; _id?: string }): string => item.id ?? item._id ?? '';
const normalizeContent = (section?: CmsSectionDto): ContentState => ({ ...getSectionTemplate((section?.type ?? 'hero_campaign') as CmsSectionType).defaults, ...Object.fromEntries(Object.entries(section?.content ?? {}).map(([key, value]) => [key, contentValue(value)])) });
const mockProductImages = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1506629905607-d9b297d84219?auto=format&fit=crop&w=700&q=80'
];

const mediaUrl = (content: ContentState, device: DevicePreview): string => {
  if (device === 'mobile') return String(content.imageUrl || content.mobileMedia || content.mobileImage || content.mobileFallbackImage || content.posterImage || content.desktopMedia || content.imageOne || content.image || '');
  return String(content.desktopMedia || content.posterImage || content.imageUrl || content.imageOne || content.image || content.mobileMedia || '');
};

const accessibleTemplateName = (name: string): string => name.replace(/\s*\/\s*/g, ' ');

const sectionImage = (section: CmsSectionInput, fallbackIndex = 0): string => {
  const content = section.content as ContentState;
  const rows = String(content.tiles || content.slides || content.scenes || '').split('\n').map((item) => item.split('|')[1]).filter(Boolean);
  return String(content.desktopMedia || content.posterImage || content.imageUrl || content.imageOne || content.image || content.craftsmanshipImage || rows[0] || mockProductImages[fallbackIndex % mockProductImages.length]);
};

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

  const sectionList = useMemo(() => (sections.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [sections.data]);
  const [defaultTemplateSections, setDefaultTemplateSections] = useState<CmsSectionDto[]>([]);
  const homepageTemplates = useMemo(() => createHomepageTemplates(defaultTemplateSections), [defaultTemplateSections]);
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = sectionList.find((section) => sectionId(section) === selectedId) ?? sectionList[0];
  const [device, setDevice] = useState<DevicePreview>('desktop');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [draft, setDraft] = useState<CmsSectionInput>(() => toInput(selected));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [libraryPreview, setLibraryPreview] = useState<SectionTemplate | null>(null);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<HomepageTemplate | null>(null);
  const [templateConfirm, setTemplateConfirm] = useState<HomepageTemplate | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<CmsSectionDto | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('builder');
  const [toast, setToast] = useState<ToastState>(null);
  const selectedRef = useRef(selectedId);
  const canvasRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!selectedId && sectionList[0]) setSelectedId(sectionId(sectionList[0]));
  }, [sectionList, selectedId]);

  useEffect(() => {
    if (!sections.isLoading && defaultTemplateSections.length === 0 && sectionList.length > 0) setDefaultTemplateSections(sectionList);
  }, [defaultTemplateSections.length, sectionList, sections.isLoading]);

  useEffect(() => {
    selectedRef.current = selectedId;
    setDraft(toInput(selected));
    setSaveState('idle');
  }, [selected, selectedId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (saveState !== 'dirty' || !selected) return;
    const id = selectedId;
    const timeout = window.setTimeout(() => {
      setSaveState('saving');
      updateSection.mutate({ ...draft, id: sectionId(selected), status: 'draft' }, {
        onSuccess: () => setSaveState(selectedRef.current === id ? 'saved' : 'idle'),
        onError: () => setSaveState('error')
      });
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [draft, saveState, selected, selectedId, updateSection]);

  const selectAndScroll = (id: string): void => {
    setSelectedId(id);
    window.setTimeout(() => canvasRefs.current.get(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  };

  const addSection = (type: CmsSectionType = 'hero_campaign', index = sectionList.length): void => {
    createSection.mutate(createDefaultSectionInput(type, index), {
      onSuccess: (section) => {
        const id = sectionId(section);
        selectAndScroll(id);
        if (index < sectionList.length) {
          const ids = sectionList.map(sectionId);
          ids.splice(index, 0, id);
          reorderSections.mutate(ids);
        }
        setToast({ tone: 'success', message: getSectionTemplate(type).name + ' added to draft.' });
      },
      onError: (error) => setToast({ tone: 'error', message: error.message })
    });
  };

  const duplicateSection = (section: CmsSectionDto): void => {
    const input = sectionDtoToInput(section, section.sortOrder + 1);
    createSection.mutate({ ...input, title: input.title + ' Copy', status: 'draft' }, { onSuccess: (next) => selectAndScroll(sectionId(next)) });
  };

  const toggleActive = (section: CmsSectionDto): void => {
    updateSection.mutate({ ...sectionDtoToInput(section), id: sectionId(section), active: !isActive(section), status: 'draft' });
  };

  const archiveOne = (section: CmsSectionDto): void => {
    setArchiveConfirm(section);
  };

  const confirmArchive = (): void => {
    if (!archiveConfirm) return;
    archiveSection.mutate(sectionId(archiveConfirm), {
      onSuccess: () => {
        setToast({ tone: 'success', message: 'Section removed from draft.' });
        setArchiveConfirm(null);
      },
      onError: (error) => setToast({ tone: 'error', message: error.message })
    });
  };

  const saveDraft = (): void => {
    if (!selected) return;
    setSaveState('saving');
    updateSection.mutate({ ...draft, id: sectionId(selected), status: 'draft' }, {
      onSuccess: () => { setSaveState('saved'); setToast({ tone: 'success', message: 'Draft saved.' }); },
      onError: (error) => { setSaveState('error'); setToast({ tone: 'error', message: error.message }); }
    });
  };

  const updateContent = (key: string, value: ContentValue): void => { setDraft((current) => ({ ...current, content: { ...current.content, [key]: value } })); setSaveState('dirty'); };
  const updateField = <TKey extends keyof CmsSectionInput>(key: TKey, value: CmsSectionInput[TKey]): void => { setDraft((current) => ({ ...current, [key]: value })); setSaveState('dirty'); };

  const confirmPublish = (): void => {
    setPublishConfirmOpen(false);
    publishPage.mutate(undefined, {
      onSuccess: () => setToast({ tone: 'success', message: 'Homepage published.' }),
      onError: (error) => setToast({ tone: 'error', message: error.message })
    });
  };

  const applyTemplate = async (template: HomepageTemplate, action: TemplateAction): Promise<void> => {
    if (!currentPageId) return;
    setTemplateConfirm(null);
    try {
      if (action === 'replace') {
        await Promise.all(sectionList.map((section) => archiveSection.mutateAsync(sectionId(section))));
      }
      const start = action === 'append' ? sectionList.length : 0;
      const created = [] as CmsSectionDto[];
      for (const [index, section] of template.sections.entries()) {
        created.push(await createSection.mutateAsync({ ...section, sortOrder: start + index, status: 'draft' }));
      }
      const first = created[0];
      if (first) selectAndScroll(sectionId(first));
      setTemplateGalleryOpen(false);
      setTemplatePreview(null);
      setToast({ tone: 'success', message: 'Template applied to draft.' });
    } catch (error: unknown) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const onDragEnd = (event: DragEndEvent): void => {
    if (!event.over) return;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    const overIndex = overId === 'canvas-dropzone' ? sectionList.length : Math.max(0, sectionList.map(sectionId).indexOf(overId));
    if (activeId.startsWith('template:')) {
      addSection(activeId.replace('template:', '') as CmsSectionType, overIndex < 0 ? sectionList.length : overIndex);
      return;
    }
    if (activeId === overId) return;
    const ids = sectionList.map(sectionId);
    const activeIndex = ids.indexOf(activeId);
    if (activeIndex < 0 || overIndex < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(activeIndex, 1);
    if (!moved) return;
    nextIds.splice(overIndex, 0, moved);
    reorderSections.mutate(nextIds);
  };

  return <DndContext onDragEnd={onDragEnd}>
    {toast ? <div className={cn('fixed right-5 top-5 z-50 border bg-background-elevated px-4 py-3 text-sm shadow-lg', toast.tone === 'success' && 'border-success text-success', toast.tone === 'error' && 'border-danger text-danger', toast.tone === 'info' && 'border-accent-gold text-accent-gold')}>{toast.message}</div> : null}
    <div className="grid gap-5">
      <BuilderHeader homePage={homePage} saveState={saveState} onAdd={() => addSection()} onSave={saveDraft} onTemplate={() => setTemplateGalleryOpen(true)} onTogglePreview={() => setIncludeInactive((current) => !current)} onPublish={() => setPublishConfirmOpen(true)} canMutate={Boolean(currentPageId)} isSaving={updateSection.isPending} isPublishing={publishPage.isPending} includeInactive={includeInactive} />
      <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === 'builder' ? <div className="grid min-w-0 gap-5 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid min-w-0 content-start gap-4">
          <SectionLibrary onAdd={(type) => addSection(type)} onPreview={setLibraryPreview} onOpenTemplates={() => setTemplateGalleryOpen(true)} />
        </aside>

        <main className="grid min-w-0 content-start gap-5">
          <SectionCanvas sectionList={sectionList} selected={selected} refs={canvasRefs} isLoading={sections.isLoading} onSelect={(section) => setSelectedId(sectionId(section))} onDuplicate={duplicateSection} onArchive={archiveOne} onToggle={toggleActive} onQuickAdd={addSection} onTemplate={() => setTemplateGalleryOpen(true)} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<Clock size={16} />} value={sectionList.filter((section) => section.status === 'published').length} label="Published" />
            <Metric icon={<Eye size={16} />} value={sectionList.filter(isActive).length} label="Visible" />
            <Metric icon={<LayoutTemplate size={16} />} value={sectionList.length} label="Sections" />
            <Metric icon={<Save size={16} />} value={saveState === 'saved' ? 1 : 0} label={saveState === 'saved' ? 'Saved' : 'Draft'} />
          </div>
          <SectionInspector selected={selected} draft={draft} saveState={saveState} onSave={saveDraft} onPreview={() => setWorkspaceTab('live-preview')} onDuplicate={duplicateSection} onArchive={archiveOne} onField={updateField} onContent={updateContent} />
          <div className="grid gap-5 lg:grid-cols-2">
            <VersionHistory versions={versions.data ?? []} isRestoring={restoreVersion.isPending} onRestore={(id) => restoreVersion.mutate(id)} />
            <MediaManager media={media.data ?? []} isSaving={createMedia.isPending} onCreate={(input) => createMedia.mutate(input)} />
          </div>
        </main>
      </div> : <PreviewWorkspace sectionList={sectionList} selected={selected} draft={draft} device={device} includeInactive={includeInactive} onDevice={setDevice} onSelect={(section) => setSelectedId(sectionId(section))} />}
    </div>

    {libraryPreview ? <SectionPreviewModal template={libraryPreview} onClose={() => setLibraryPreview(null)} onAdd={(type) => { addSection(type); setLibraryPreview(null); }} /> : null}
    {templateGalleryOpen ? <TemplateGallery templates={homepageTemplates} onClose={() => setTemplateGalleryOpen(false)} onPreview={setTemplatePreview} onUse={setTemplateConfirm} /> : null}
    {templatePreview ? <TemplatePreviewModal template={templatePreview} onClose={() => setTemplatePreview(null)} onUse={(template) => setTemplateConfirm(template)} /> : null}
    {templateConfirm ? <TemplateConfirmModal template={templateConfirm} onClose={() => setTemplateConfirm(null)} onApply={(action) => void applyTemplate(templateConfirm, action)} /> : null}
    {publishConfirmOpen ? <PublishConfirmModal isPublishing={publishPage.isPending} onClose={() => setPublishConfirmOpen(false)} onPublish={confirmPublish} /> : null}
    {archiveConfirm ? <ArchiveConfirmModal section={archiveConfirm} isArchiving={archiveSection.isPending} onClose={() => setArchiveConfirm(null)} onArchive={confirmArchive} /> : null}
  </DndContext>;
}

function WorkspaceTabs({ active, onChange }: { active: WorkspaceTab; onChange: (tab: WorkspaceTab) => void; }): ReactNode {
  const items: Array<{ id: WorkspaceTab; label: string; description: string }> = [
    { id: 'builder', label: 'Builder', description: 'Add, edit, reorder' },
    { id: 'live-preview', label: 'Live Preview', description: 'Review full homepage' }
  ];
  return <div className="grid gap-2 border border-border bg-background-elevated p-2 shadow-lg sm:grid-cols-2">
    {items.map((item) => <button key={item.id} type="button" className={cn('border px-4 py-3 text-left transition', active === item.id ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-transparent bg-background-primary text-text-secondary hover:border-border-subtle hover:text-text-primary')} onClick={() => onChange(item.id)} aria-pressed={active === item.id}>
      <span className="block text-xs uppercase tracking-[0.14em]">{item.label}</span>
      <span className={cn('mt-1 block text-xs', active === item.id ? 'text-text-inverse/75' : 'text-text-muted')}>{item.description}</span>
    </button>)}
  </div>;
}

function BuilderHeader({ homePage, saveState, onAdd, onSave, onTemplate, onTogglePreview, onPublish, canMutate, isSaving, isPublishing, includeInactive }: { homePage?: CmsPageDto; saveState: SaveState; onAdd: () => void; onSave: () => void; onTemplate: () => void; onTogglePreview: () => void; onPublish: () => void; canMutate: boolean; isSaving: boolean; isPublishing: boolean; includeInactive: boolean; }): ReactNode {
  const labels: Record<SaveState, string> = { idle: 'Ready', dirty: 'Unsaved changes', saving: 'Saving...', saved: 'Draft saved', error: 'Save failed - Retry' };
  return <div className="grid gap-4 border border-border bg-background-elevated p-5 shadow-lg xl:grid-cols-[minmax(220px,1fr)_auto] xl:items-center">
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Homepage Builder</p>
      <h2 className="mt-2 font-display text-3xl leading-tight text-text-primary">{homePage?.title ?? 'Homepage'}</h2>
      <p className={cn('mt-2 text-xs uppercase tracking-[0.12em]', saveState === 'error' ? 'text-danger' : saveState === 'saved' ? 'text-success' : 'text-text-secondary')}>{labels[saveState]}</p>
    </div>
    <div className="flex flex-wrap gap-2 xl:justify-end">
      <Button type="button" onClick={onTemplate} disabled={!canMutate}><LayoutTemplate size={16} />Use Template</Button>
      <Button type="button" onClick={onAdd} disabled={!canMutate}><Plus size={16} />Add Section</Button>
      <Button type="button" variant="secondary" onClick={onSave} disabled={!canMutate || isSaving}><Save size={16} />Save Draft</Button>
      <Button type="button" variant="secondary" onClick={onTogglePreview}><Eye size={16} />{includeInactive ? 'Hide Disabled' : 'Show Disabled'}</Button>
      <Button type="button" onClick={onPublish} disabled={!canMutate || isPublishing}><Rocket size={16} />Publish</Button>
    </div>
  </div>;
}

function SectionLibrary({ onAdd, onPreview, onOpenTemplates }: { onAdd: (type: CmsSectionType) => void; onPreview: (template: SectionTemplate) => void; onOpenTemplates: () => void; }): ReactNode {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | SectionCategory>('All');
  const [quick, setQuick] = useState<string>('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SECTION_TEMPLATES.filter((template) => {
      const haystack = [template.name, template.description, template.category, template.bestFor, ...template.tags].join(' ').toLowerCase();
      return (!needle || haystack.includes(needle)) && (category === 'All' || template.category === category) && (!quick || template.badge === quick || template.tags.includes(quick.toLowerCase()));
    });
  }, [category, query, quick]);

  return <section className="border border-border bg-background-elevated p-4 shadow-lg">
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="font-display text-xl leading-tight">Section Blocks</h3><p className="mt-1 text-xs text-text-secondary">Visual block library with live mini previews.</p></div>
      <Button type="button" variant="ghost" onClick={onOpenTemplates} aria-label="Open templates"><LayoutTemplate size={15} />Templates</Button>
    </div>
    <label className="mt-4 flex h-11 items-center gap-2 border border-border-subtle bg-background-input px-3 text-sm text-text-secondary focus-within:border-accent-gold"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sections..." className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted" /></label>
    <div className="mt-4 grid grid-cols-2 gap-2">{categories.map((item) => <button key={item} type="button" className={cn('truncate border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition', category === item ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border-subtle text-text-secondary hover:border-accent-gold hover:text-text-primary')} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{quickFilters.map((item) => <button key={item} type="button" className={cn('border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition', quick === item ? 'border-accent-gold text-accent-gold' : 'border-border-subtle text-text-muted hover:text-text-primary')} onClick={() => setQuick((current) => current === item ? '' : item)}>{item}</button>)}</div>
    <div className="mt-5 grid max-h-[640px] gap-3 overflow-auto pr-1">{filtered.map((template) => <SectionTemplateCard key={template.type} template={template} onPreview={onPreview} onAdd={onAdd} />)}</div>
  </section>;
}

function SectionTemplateCard({ template, onPreview, onAdd }: { template: SectionTemplate; onPreview: (template: SectionTemplate) => void; onAdd: (type: CmsSectionType) => void; }): ReactNode {
  const draggable = useDraggable({ id: 'template:' + template.type });
  const Icon = template.icon;
  const Mini = template.miniPreview;
  return <article ref={draggable.setNodeRef} {...draggable.attributes} className="group overflow-hidden border border-border-subtle bg-background-primary transition duration-200 hover:border-accent-gold hover:shadow-gold">
    <div {...draggable.listeners} className="cursor-grab active:cursor-grabbing"><Mini /></div>
    <div className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-accent-gold"><Icon size={14} />{template.category}</p><h4 className="mt-1 truncate font-display text-lg text-text-primary">{template.name}</h4></div>
        {template.badge ? <span className="border border-accent-gold/40 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-accent-gold">{template.badge}</span> : null}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">{template.description}</p>
      <p className="mt-2 truncate text-[11px] text-text-muted"><span className="text-text-secondary">Best for:</span> {template.bestFor}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" data-testid={'cms-preview-' + template.type} aria-label={'Preview ' + accessibleTemplateName(template.name)} onClick={() => onPreview(template)}><Eye size={15} />Preview</Button>
        <Button type="button" data-testid={'cms-add-' + template.type} aria-label={'Add ' + accessibleTemplateName(template.name)} onClick={() => onAdd(template.type)}><Plus size={15} />Add</Button>
      </div>
    </div>
  </article>;
}

function SectionCanvas({ sectionList, selected, refs, isLoading, onSelect, onDuplicate, onArchive, onToggle, onQuickAdd, onTemplate }: { sectionList: CmsSectionDto[]; selected?: CmsSectionDto; refs: React.MutableRefObject<Map<string, HTMLElement>>; isLoading: boolean; onSelect: (section: CmsSectionDto) => void; onDuplicate: (section: CmsSectionDto) => void; onArchive: (section: CmsSectionDto) => void; onToggle: (section: CmsSectionDto) => void; onQuickAdd: (type: CmsSectionType) => void; onTemplate: () => void; }): ReactNode {
  const droppable = useDroppable({ id: 'canvas-dropzone' });
  return <section ref={droppable.setNodeRef} className="min-w-0 border border-border bg-background-elevated p-4 shadow-lg">
    <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Canvas</p><h3 className="mt-2 font-display text-2xl">Homepage Sections</h3></div><StatusPill tone="neutral">{sectionList.length} sections</StatusPill></div>
    <div className="mt-5 grid gap-3">{isLoading ? <p className="text-sm text-text-secondary">{COPY.common.loading}</p> : sectionList.length ? sectionList.map((section) => <SectionCanvasCard key={sectionId(section)} section={section} nodeRef={(node) => { const id = sectionId(section); if (node) refs.current.set(id, node); else refs.current.delete(id); }} selected={selected ? sectionId(section) === sectionId(selected) : false} onSelect={() => onSelect(section)} onDuplicate={() => onDuplicate(section)} onArchive={() => onArchive(section)} onToggle={() => onToggle(section)} />) : <EmptyHomepageState onQuickAdd={onQuickAdd} onTemplate={onTemplate} />}</div>
  </section>;
}

function SectionCanvasCard({ section, selected, nodeRef, onSelect, onDuplicate, onArchive, onToggle }: { section: CmsSectionDto; selected: boolean; nodeRef: (node: HTMLElement | null) => void; onSelect: () => void; onDuplicate: () => void; onArchive: () => void; onToggle: () => void; }): ReactNode {
  const id = sectionId(section);
  const template = getSectionTemplate((section.type ?? 'hero_campaign') as CmsSectionType);
  const Icon = template.icon;
  const draggable = useDraggable({ id });
  const droppable = useDroppable({ id });
  const missing = template.requiredFields.some((field) => field === 'title' ? !section.title : !String((section.content ?? {})[field.replace('content.', '')] ?? '').trim());
  return <article ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); nodeRef(node); }} className={cn('border bg-background-primary transition', selected ? 'border-accent-gold shadow-gold' : 'border-border-subtle hover:border-border-strong')}>
    <button type="button" aria-label={'Edit section: ' + section.title} onClick={onSelect} className="grid w-full grid-cols-[32px_1fr] gap-3 p-3 text-left">
      <span {...draggable.listeners} {...draggable.attributes} className="flex h-9 w-9 cursor-grab items-center justify-center border border-border bg-background-elevated text-text-secondary active:cursor-grabbing"><GripVertical size={16} /></span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-accent-gold"><Icon size={15} />{template.name}</span>
        <span className="mt-1 block truncate font-display text-lg text-text-primary">{section.title}</span>
        <span className="mt-2 flex flex-wrap gap-2">
          <StatusPill tone={isActive(section) ? 'success' : 'neutral'}>{isActive(section) ? COPY.table.active : COPY.table.inactive}</StatusPill>
          <StatusPill tone="neutral">{section.hideOnDesktop ? 'No desktop' : 'Desktop'}</StatusPill>
          <StatusPill tone="neutral">{section.hideOnMobile ? 'No mobile' : 'Mobile'}</StatusPill>
          <StatusPill tone={missing ? 'warning' : 'success'}>{missing ? 'Needs content' : 'Valid'}</StatusPill>
          <StatusPill tone="neutral">{scheduleLabel(section)}</StatusPill>
        </span>
      </span>
    </button>
    <div className="grid grid-cols-4 border-t border-border-subtle">
      <button type="button" className="flex h-9 items-center justify-center text-text-secondary hover:text-text-primary" aria-label={'Toggle visibility section: ' + section.title} onClick={onToggle}>{isActive(section) ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button>
      <button type="button" className="flex h-9 items-center justify-center text-text-secondary hover:text-text-primary" aria-label={'Duplicate section: ' + section.title} onClick={onDuplicate}><Copy size={16} /></button>
      <button type="button" className="flex h-9 items-center justify-center text-text-secondary hover:text-text-primary" aria-label={'Preview section: ' + section.title} onClick={onSelect}><Eye size={16} /></button>
      <button type="button" className="flex h-9 items-center justify-center text-danger hover:brightness-125" aria-label={'Delete section: ' + section.title} onClick={onArchive}><Trash2 size={16} /></button>
    </div>
  </article>;
}

function EmptyHomepageState({ onQuickAdd, onTemplate }: { onQuickAdd: (type: CmsSectionType) => void; onTemplate: () => void; }): ReactNode {
  return <div className="border border-dashed border-border-subtle bg-background-primary p-8 text-center">
    <div className="mx-auto grid h-32 max-w-sm grid-cols-[1fr_1.4fr_1fr] items-end gap-2">
      <div className="h-20 border border-border-subtle bg-white/[0.04]" /><div className="h-32 border border-accent-gold/40 bg-gradient-to-b from-accent-gold/15 to-white/[0.03]" /><div className="h-24 border border-border-subtle bg-white/[0.04]" />
    </div>
    <h3 className="mt-6 font-display text-3xl text-text-primary">Start building your homepage</h3>
    <p className="mx-auto mt-3 max-w-lg text-sm text-text-secondary">Add a hero, product carousel, drop banner, or editorial story to shape your storefront.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <Button type="button" onClick={() => onQuickAdd('hero_campaign')}>Add Hero Campaign</Button>
      <Button type="button" variant="secondary" onClick={() => onQuickAdd('product_carousel')}>Add Product Carousel</Button>
      <Button type="button" variant="secondary" onClick={() => onQuickAdd('hot_drop')}>Add Hot Drop</Button>
      <Button type="button" variant="secondary" onClick={onTemplate}>Use Template</Button>
    </div>
  </div>;
}

function SectionInspector({ selected, draft, saveState, onSave, onPreview, onDuplicate, onArchive, onField, onContent }: { selected?: CmsSectionDto; draft: CmsSectionInput; saveState: SaveState; onSave: () => void; onPreview: () => void; onDuplicate: (section: CmsSectionDto) => void; onArchive: (section: CmsSectionDto) => void; onField: <TKey extends keyof CmsSectionInput>(key: TKey, value: CmsSectionInput[TKey]) => void; onContent: (key: string, value: ContentValue) => void; }): ReactNode {
  const [productQuery, setProductQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [mediaUploadMessage, setMediaUploadMessage] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const cmsUploadSignature = useCmsUploadSignature();
  const products = useAdminProducts({ q: productQuery.trim() || undefined, status: 'visible', limit: 24 });
  const categoriesData = useAdminCategories();
  const collectionsData = useAdminCollections();
  const selectedProductIds = Array.from(new Set([...draft.products, ...parseIds(contentValue(draft.content.productIds))]));
  const selectedCategoryIds = draft.categories;
  const selectedCollectionIds = parseIds(contentValue(draft.content.collectionIds));
  const filteredCategories = useMemo(() => filterReferences(categoriesData.data ?? [], categoryQuery, categoryLabel), [categoriesData.data, categoryQuery]);
  const filteredCollections = useMemo(() => filterReferences(collectionsData.data ?? [], collectionQuery, collectionLabel), [collectionsData.data, collectionQuery]);
  const uploadMobileMedia = async (file?: File): Promise<void> => {
    if (!file) return;
    setMediaUploading(true);
    setMediaUploadMessage('Uploading ' + file.name + '…');
    try {
      const signature = await cmsUploadSignature.mutateAsync();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', String(process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? ''));
      formData.append('timestamp', String(signature.timestamp));
      formData.append('signature', signature.signature);
      formData.append('folder', signature.folder);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Missing Cloudinary configuration');
      const response = await externalUploadApi.post<CloudinaryUploadResponse>(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
      const url = response.data.secure_url;
      if (!url) throw new Error('Upload did not return a media URL');
      const isVideo = file.type.startsWith('video/');
      onContent('mediaType', isVideo ? 'video' : 'image');
      onContent(isVideo ? 'videoUrl' : 'imageUrl', url);
      setMediaUploadMessage('Upload complete. Save or publish when ready.');
    } catch (error) {
      setMediaUploadMessage(error instanceof Error ? error.message : 'Media upload failed.');
    } finally {
      setMediaUploading(false);
    }
  };
  const updateProducts = (ids: string[]): void => {
    onField('products', ids);
    onContent('productIds', ids.join(', '));
    const product = (products.data?.items ?? []).find((item) => ids[0] && itemId(item) === ids[0]);
    if (product && draft.type === 'shop_the_look') {
      onContent('ctaLink', '/product/' + product.slug);
      onContent('ctaText', 'View Product');
    }
  };
  const updateCategories = (ids: string[]): void => {
    onField('categories', ids);
  };
  const updateCollections = (ids: string[]): void => {
    onContent('collectionIds', ids.join(', '));
    const collection = (collectionsData.data ?? []).find((item) => ids[0] && itemId(item) === ids[0]);
    if (collection) {
      onContent('collectionSlug', collection.slug);
      onContent('collectionLabel', collection.title);
      if (!String(draft.content.ctaLink ?? '').trim() || String(draft.content.ctaLink).startsWith('/collections')) onContent('ctaLink', '/collections/' + collection.slug);
      if (!String(draft.content.image ?? '').trim()) onContent('image', collection.heroImage ?? collection.bannerImage ?? collection.cardImage ?? '');
    }
  };
  const contentEntries = Object.entries(draft.content).filter(([key]) => !['productIds', 'collectionIds', 'collectionSlug'].includes(key));
  return <section className="border border-border bg-background-elevated p-5 shadow-lg">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div><p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Selected Section Editor</p><h3 className="mt-2 font-display text-2xl">{selected?.title ?? 'No section selected'}</h3></div>
      {selected ? <StatusPill tone={saveState === 'saved' ? 'success' : saveState === 'error' ? 'warning' : 'gold'}>{saveState === 'dirty' ? 'Unsaved' : saveState === 'saving' ? 'Saving' : draft.status}</StatusPill> : null}
    </div>
    {selected ? <div className="mt-6 grid gap-4">
      <InspectorGroup title="Basic Info" helper="Name the block and choose where this section appears in the store.">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Section Type" options={SECTION_TEMPLATES.map((item) => ({ label: item.name, value: item.type }))} value={draft.type} onChange={(event) => { const type = event.target.value as CmsSectionType; onField('type', type); onField('content', { ...getSectionTemplate(type).defaults, ...draft.content }); if (type === 'mobile_media_landing') { onField('hideOnDesktop', true); onField('hideOnMobile', false); } }} />
          <SelectField label="Page Target" options={targetOptions} value={draft.pageTarget} onChange={(event) => onField('pageTarget', event.target.value)} />
          <Input label={COPY.fields.title} value={draft.title} onChange={(event) => onField('title', event.target.value)} placeholder="Customer-facing headline" />
          <Input label={COPY.fields.subtitle} value={draft.subtitle ?? ''} onChange={(event) => onField('subtitle', event.target.value)} placeholder="Short supporting copy" />
          <SelectField label={COPY.fields.status} options={statusOptions} value={draft.status} onChange={(event) => onField('status', event.target.value as CmsStatus)} />
          <Input label={COPY.fields.sortOrder} type="number" value={draft.sortOrder} onChange={(event) => onField('sortOrder', Number(event.target.value))} />
        </div>
        <label className="mt-4 block text-xs uppercase tracking-[0.15em] text-text-secondary"><span>Description</span><textarea className="mt-2 min-h-24 w-full border border-border-subtle bg-background-input px-4 py-3 text-sm normal-case tracking-normal text-text-primary" value={draft.description ?? ''} onChange={(event) => onField('description', event.target.value)} placeholder="Internal note or longer storefront copy for editorial blocks." /></label>
      </InspectorGroup>
      <InspectorGroup title="Visibility & Scheduling" helper="Control device targeting, campaign dates, and whether the block can appear after publish.">
        {draft.type === 'mobile_media_landing' ? <p className="mb-4 border border-accent-gold/30 bg-accent-gold/5 px-3 py-2 text-xs text-accent-gold">This section is always mobile-only on the storefront.</p> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Active" options={boolOptions} value={String(draft.active)} onChange={(event) => onField('active', event.target.value === 'true')} />
          {draft.type !== 'mobile_media_landing' ? <SelectField label="Hide Desktop" options={boolOptions} value={String(draft.hideOnDesktop)} onChange={(event) => onField('hideOnDesktop', event.target.value === 'true')} /> : null}
          {draft.type !== 'mobile_media_landing' ? <SelectField label="Hide Mobile" options={boolOptions} value={String(draft.hideOnMobile)} onChange={(event) => onField('hideOnMobile', event.target.value === 'true')} /> : null}
          <Input label={COPY.fields.startDate} type="date" value={draft.startDate ?? ''} onChange={(event) => onField('startDate', event.target.value)} />
          <Input label={COPY.fields.endDate} type="date" value={draft.endDate ?? ''} onChange={(event) => onField('endDate', event.target.value)} />
        </div>
      </InspectorGroup>
      <InspectorGroup title="Content, Media & CTA" helper="Edit the storefront copy, media URLs, CTA links, timers, slides, and tracking fields supported by this block.">
        {draft.type === 'mobile_media_landing' ? <div className="mb-4 border border-border-subtle bg-background-input p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">Upload mobile media</p>
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 border border-accent-gold px-4 py-3 text-xs uppercase tracking-[0.1em] text-accent-gold hover:bg-accent-gold/10">
            <UploadCloud size={16} />{mediaUploading ? 'Uploading…' : 'Choose image or video'}
            <input type="file" accept="image/*,video/*" className="sr-only" disabled={mediaUploading} onChange={(event) => { const file = event.target.files?.[0]; void uploadMobileMedia(file); event.target.value = ''; }} />
          </label>
          {mediaUploadMessage ? <p className="mt-3 text-xs text-text-secondary" role="status">{mediaUploadMessage}</p> : null}
        </div> : null}
        <div className="grid gap-4 md:grid-cols-2">{contentEntries.map(([key, value]) => <ContentInput key={key} name={key} value={contentValue(value)} onChange={(next) => onContent(key, next)} />)}</div>
      </InspectorGroup>
      <InspectorGroup title="Products / Categories / Collections" helper={draft.type === 'shop_the_look' ? 'Select the product shown in the image. Its direct product-page link is filled automatically; you can also edit CTA Link above.' : 'Search by product, category, or collection name. Selections are saved as CMS references for storefront hydration.'}>
        <div className="grid gap-4 xl:grid-cols-3">
          <ReferencePicker<ProductDto> label="Products" query={productQuery} onQuery={setProductQuery} items={products.data?.items ?? []} selectedIds={selectedProductIds} isLoading={products.isLoading} getId={itemId} getLabel={productLabel} getMeta={(item) => item.slug + ' / ' + (item.status ?? 'published')} onChange={updateProducts} />
          <ReferencePicker<CategoryDto> label="Categories" query={categoryQuery} onQuery={setCategoryQuery} items={filteredCategories} selectedIds={selectedCategoryIds} isLoading={categoriesData.isLoading} getId={itemId} getLabel={categoryLabel} getMeta={(item) => item.slug} onChange={updateCategories} />
          <ReferencePicker<CollectionDto> label="Collections" query={collectionQuery} onQuery={setCollectionQuery} items={filteredCollections} selectedIds={selectedCollectionIds} isLoading={collectionsData.isLoading} getId={itemId} getLabel={collectionLabel} getMeta={(item) => item.slug} onChange={updateCollections} />
        </div>
      </InspectorGroup>
      <div className="flex flex-wrap gap-2 border border-border-subtle bg-background-primary p-4">
        <Button type="button" onClick={onSave}><Save size={16} />{saveState === 'saving' ? COPY.common.loading : 'Save Draft'}</Button>
        <Button type="button" variant="secondary" onClick={() => onDuplicate(selected)}><Copy size={16} />Duplicate</Button>
        <Button type="button" variant="secondary" onClick={onPreview}><Eye size={16} />Preview</Button>
        <Button type="button" variant="danger" onClick={() => onArchive(selected)}><Trash2 size={16} />Delete</Button>
      </div>
    </div> : <div className="mt-6"><EmptyPanel title="No section selected" message="Create a section to edit its campaign fields." /></div>}
  </section>;
}

function InspectorGroup({ title, helper, children }: { title: string; helper: string; children: ReactNode }): ReactNode {
  return <fieldset className="border border-border-subtle bg-background-primary p-4">
    <legend className="px-2 font-mono text-xs uppercase tracking-[0.14em] text-accent-gold">{title}</legend>
    <p className="mb-4 text-xs leading-5 text-text-muted">{helper}</p>
    {children}
  </fieldset>;
}

function filterReferences<TItem>(items: TItem[], query: string, labelFor: (item: TItem) => string): TItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items.slice(0, 24);
  return items.filter((item) => labelFor(item).toLowerCase().includes(needle)).slice(0, 24);
}

function productLabel(product: ProductDto): string {
  return product.title;
}

function categoryLabel(category: CategoryDto): string {
  return category.name;
}

function collectionLabel(collection: CollectionDto): string {
  return collection.title;
}

function ReferencePicker<TItem>({ label, query, onQuery, items, selectedIds, isLoading, getId, getLabel, getMeta, onChange }: { label: string; query: string; onQuery: (query: string) => void; items: TItem[]; selectedIds: string[]; isLoading: boolean; getId: (item: TItem) => string; getLabel: (item: TItem) => string; getMeta?: (item: TItem) => string; onChange: (ids: string[]) => void; }): ReactNode {
  const selected = new Set(selectedIds);
  const toggle = (id: string): void => {
    if (!id) return;
    const next = selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    onChange(next);
  };
  return <div className="min-w-0 border border-border-subtle p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <p className="mt-1 text-xs text-text-muted">{selectedIds.length} selected</p>
      </div>
      {selectedIds.length ? <button type="button" className="text-xs uppercase tracking-[0.1em] text-accent-gold" onClick={() => onChange([])}>Clear</button> : null}
    </div>
    <label className="mt-3 flex h-10 items-center gap-2 border border-border-subtle bg-background-input px-3 text-sm text-text-secondary focus-within:border-accent-gold">
      <Search size={14} />
      <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={'Search ' + label.toLowerCase()} className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted" />
    </label>
    <div className="mt-3 grid max-h-60 gap-2 overflow-auto pr-1">
      {isLoading ? <p className="text-sm text-text-secondary">{COPY.common.loading}</p> : items.length ? items.map((item) => {
        const id = getId(item);
        const checked = selected.has(id);
        return <button key={id} type="button" className={cn('grid grid-cols-[18px_1fr] gap-2 border px-3 py-2 text-left transition', checked ? 'border-accent-gold bg-accent-gold/10' : 'border-border-subtle hover:border-border-strong')} onClick={() => toggle(id)} aria-pressed={checked}>
          <span className={cn('mt-0.5 h-4 w-4 border', checked ? 'border-accent-gold bg-accent-gold' : 'border-border-subtle')} />
          <span className="min-w-0">
            <span className="block truncate text-sm text-text-primary">{getLabel(item)}</span>
            {getMeta ? <span className="mt-0.5 block truncate text-xs text-text-muted">{getMeta(item)}</span> : null}
          </span>
        </button>;
      }) : <p className="text-sm text-text-secondary">No {label.toLowerCase()} found.</p>}
    </div>
    {selectedIds.length ? <p className="mt-3 break-words font-mono text-[10px] leading-4 text-text-muted">{selectedIds.join(', ')}</p> : null}
  </div>;
}

function PreviewWorkspace({ sectionList, selected, draft, device, includeInactive, onDevice, onSelect }: { sectionList: CmsSectionDto[]; selected?: CmsSectionDto; draft: CmsSectionInput; device: DevicePreview; includeInactive: boolean; onDevice: (device: DevicePreview) => void; onSelect: (section: CmsSectionDto) => void; }): ReactNode {
  return <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="border border-border bg-background-elevated p-4 shadow-lg">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">Preview Index</p>
      <h3 className="mt-2 font-display text-2xl">Homepage</h3>
      <div className="mt-5 grid gap-2">{sectionList.length ? sectionList.map((section, index) => {
        const activeSection = selected ? sectionId(section) === sectionId(selected) : false;
        return <button key={sectionId(section)} type="button" className={cn('grid grid-cols-[24px_1fr] gap-2 border px-3 py-3 text-left transition', activeSection ? 'border-accent-gold bg-accent-gold/10' : 'border-border-subtle bg-background-primary hover:border-border-strong')} onClick={() => onSelect(section)}>
          <span className="font-mono text-xs text-text-muted">{index + 1}</span>
          <span className="min-w-0"><span className="block truncate text-sm text-text-primary">{section.title}</span><span className="mt-1 block truncate text-[10px] uppercase tracking-[0.12em] text-text-muted">{getSectionTemplate((section.type ?? 'hero_campaign') as CmsSectionType).name}</span></span>
        </button>;
      }) : <p className="text-sm text-text-secondary">No sections yet.</p>}</div>
    </aside>
    <LivePreview sectionList={sectionList} selected={selected} draft={draft} device={device} includeInactive={includeInactive} onDevice={onDevice} full />
  </div>;
}

function LivePreview({ sectionList, selected, draft, device, includeInactive, onDevice, full = false }: { sectionList: CmsSectionDto[]; selected?: CmsSectionDto; draft: CmsSectionInput; device: DevicePreview; includeInactive: boolean; onDevice: (device: DevicePreview) => void; full?: boolean; }): ReactNode {
  const visible = sectionList.filter((section) => includeInactive || isActive(section)).filter((section) => device === 'mobile' ? !section.hideOnMobile : section.type !== 'mobile_media_landing' && !section.hideOnDesktop);
  return <div className="min-w-0 border border-border bg-background-elevated p-4 shadow-lg">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="font-display text-xl">Live Preview</h3>{full ? <p className="mt-1 text-xs text-text-secondary">Draft preview updates instantly and does not publish changes.</p> : null}</div>
      <div className="flex border border-border-subtle">{(['desktop', 'tablet', 'mobile'] as DevicePreview[]).map((item) => <button key={item} type="button" aria-label={item + ' preview'} className={cn('flex h-10 w-11 items-center justify-center text-text-secondary', device === item && 'bg-accent-gold text-text-inverse')} onClick={() => onDevice(item)}>{item === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}</button>)}</div>
    </div>
    <div className={cn('mx-auto mt-5 overflow-hidden border border-border bg-background-primary shadow-lg', device === 'desktop' && (full ? 'h-[780px] w-full' : 'h-[560px] w-full'), device === 'tablet' && (full ? 'h-[780px] w-[82%]' : 'h-[560px] w-[82%]'), device === 'mobile' && (full ? 'h-[780px] w-[390px] max-w-full' : 'h-[560px] w-[340px] max-w-full'))}>
      <div className="h-full overflow-auto">{visible.length ? visible.map((section) => <PreviewSection key={sectionId(section)} section={selected && sectionId(section) === sectionId(selected) ? { ...section, ...draft, content: draft.content, active: draft.active, isActive: draft.active } : section} device={device} includeInactive={includeInactive} />) : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-secondary">No enabled sections for this device.</div>}</div>
    </div>
  </div>;
}

function PreviewSection({ section, device, includeInactive }: { section: CmsSectionDto; device: DevicePreview; includeInactive: boolean; }): ReactNode {
  if (!includeInactive && !isActive(section)) return null;
  if (device === 'mobile' && section.hideOnMobile) return null;
  if (section.type === 'mobile_media_landing' && device !== 'mobile') return null;
  if (device !== 'mobile' && section.hideOnDesktop) return null;
  const content = normalizeContent(section);
  const template = getSectionTemplate((section.type ?? 'hero_campaign') as CmsSectionType);
  const image = mediaUrl(content, device);
  const overlay = Number(content.overlayOpacity || 42) / 100;
  if (section.type === 'announcement_bar' || section.type === 'marquee_strip') return <div className="overflow-hidden border-b border-white/15 px-4 py-3 text-center text-[10px] uppercase tracking-[0.18em]" style={{ backgroundColor: String(content.backgroundColor || '#0f0f0f') }}>{String(content.text ?? section.title)}</div>;
  if (section.type === 'discount_banner' || section.type === 'limited_drop_timer') return <section className="border-y border-white/15 px-5 py-8 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{String(content.couponCode || content.label || 'Limited')}</p><h3 className="mt-3 font-display text-3xl">{String(content.discountTitle || section.title)}</h3><p className="mt-4 text-xs uppercase tracking-[0.14em]">{String(content.ctaText ?? 'Shop now')}</p></section>;
  if (section.type === 'newsletter') return <section className="px-5 py-10 text-center"><h3 className="font-display text-3xl">{section.title}</h3><p className="mx-auto mt-3 max-w-sm text-sm text-text-secondary">{String(content.offerText || section.subtitle)}</p><div className="mx-auto mt-6 flex max-w-sm border border-white/20"><span className="flex-1 px-4 py-3 text-left text-xs text-text-muted">Email address</span><span className="bg-[#c8a97e] px-4 py-3 text-xs uppercase text-[#080808]">Join</span></div></section>;
  if (['product_carousel', 'trending_now', 'hot_drop', 'featured_collection', 'recently_viewed', 'best_sellers'].includes(String(section.type))) return <section className="px-5 py-10"><p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{template.name}</p><h3 className="mt-3 font-display text-3xl">{section.title}</h3><div className="mt-6 grid grid-cols-2 gap-2">{mockProductImages.map((image, item) => <div key={image} className="border border-white/10 bg-white/[0.04]"><div className="aspect-[3/4] overflow-hidden bg-white/10"><img src={image} alt="" className="h-full w-full object-cover opacity-85" /></div><div className="p-2"><p className="truncate text-[11px] text-text-primary">{item === 0 ? 'Transit Jacket' : item === 1 ? 'Ribbed Tank' : item === 2 ? 'Wide Trouser' : 'Leather Tote'}</p><p className="mt-1 font-mono text-[10px] text-[#c8a97e]">Rs. {item === 0 ? '4,999' : item === 1 ? '2,499' : item === 2 ? '3,999' : '6,299'}</p></div></div>)}</div></section>;
  if (section.type === 'shop_the_look') return <section className="grid gap-px bg-white/10 md:grid-cols-[1.2fr_0.8fr]"><div className="relative min-h-[360px] overflow-hidden bg-white/10"><img src={String(content.image || mockProductImages[0])} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /><span className="absolute left-[42%] top-[34%] h-4 w-4 rounded-full border-2 border-black bg-[#c8a97e]" /><span className="absolute bottom-[24%] left-[58%] h-4 w-4 rounded-full border-2 border-black bg-[#c8a97e]" /></div><div className="p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">Shop The Look</p><h3 className="mt-3 font-display text-3xl">{section.title}</h3><p className="mt-3 text-sm text-text-secondary">{section.subtitle}</p></div></section>;
  if (section.type === 'category_editorial_grid') return <section className="grid grid-cols-2 gap-px p-5">{String(content.tiles ?? '').split('\n').slice(0, 4).map((tile) => { const [label, url] = tile.split('|'); return <div key={tile} className="relative aspect-[3/4] overflow-hidden bg-white/10">{url ? <img src={url} alt="" className="h-full w-full object-cover opacity-80" /> : null}<p className="absolute bottom-4 left-4 font-display text-2xl">{label}</p></div>; })}</section>;
  if (section.type === 'video_landing') {
    const videoUrl = String(content.videoUrl || '');
    const posterImage = String(content.posterImage || content.mobileFallbackImage || image || '');
    return <section className="relative min-h-[520px] overflow-hidden bg-background-primary">
      {videoUrl ? <video src={videoUrl} poster={posterImage} autoPlay={Boolean(content.autoplay ?? true)} muted={Boolean(content.muted ?? true)} loop={Boolean(content.loop ?? true)} playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : posterImage ? <img src={posterImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative flex min-h-[520px] flex-col justify-end p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{template.name}</p>
        <h3 className="mt-4 max-w-lg font-display text-4xl text-text-primary">{section.title}</h3>
        <p className="mt-3 max-w-md text-sm text-text-secondary">{section.subtitle}</p>
        <p className="mt-7 text-xs uppercase tracking-[0.14em]">{String(content.ctaText || 'Explore')}</p>
      </div>
    </section>;
  }
  if (section.type === 'mobile_media_landing') {
    const mediaType = String(content.mediaType || 'image');
    const videoUrl = String(content.videoUrl || '');
    const imageUrl = String(content.imageUrl || content.posterImage || '');
    const ctaText = String(content.ctaText || '').trim();
    const ctaLink = String(content.ctaLink || '').trim();
    return <section className="relative min-h-[620px] overflow-hidden bg-background-primary">
      {mediaType === 'video' && videoUrl ? <video src={videoUrl} poster={String(content.posterImage || '')} autoPlay={Boolean(content.autoplay ?? true)} muted={Boolean(content.muted ?? true)} loop={Boolean(content.loop ?? true)} playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" /> : imageUrl ? <img src={imageUrl} alt={String(content.altText || '')} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.14em] text-text-muted">Add a mobile image or video URL</div>}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Math.min(100, Math.max(0, Number(content.overlayOpacity || 0))) / 100})` }} />
      {ctaText && ctaLink ? <div className="absolute inset-x-0 bottom-10 flex justify-center px-6"><span className="px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#f0d9ae] drop-shadow-[0_0_8px_rgba(200,169,126,0.65)]">{ctaText}</span></div> : null}
    </section>;
  }
  return <section className="relative min-h-[520px] overflow-hidden bg-background-primary">
    {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}
    <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
    <div className="relative flex min-h-[520px] flex-col justify-end p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#c8a97e]">{String(content.campaignLabel || template.name)}</p>
      <h3 className="mt-4 max-w-lg font-display text-4xl text-text-primary">{section.title}</h3>
      <p className="mt-3 max-w-md text-sm text-text-secondary">{section.subtitle}</p>
      <p className="mt-7 text-xs uppercase tracking-[0.14em]">{String(content.ctaText || 'Explore')}</p>
    </div>
  </section>;
}

function SectionPreviewModal({ template, onClose, onAdd }: { template: SectionTemplate; onClose: () => void; onAdd: (type: CmsSectionType) => void; }): ReactNode {
  useEscape(onClose);
  const Full = template.fullPreview;
  return <ModalShell title={template.name} onClose={onClose}>
    <Full />
    <p className="mt-5 text-sm leading-6 text-text-secondary">{template.description}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoBlock label="Category" value={template.category} /><InfoBlock label="Best for" value={template.bestFor} /></div>
    <div className="mt-5"><p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Editable fields</p><div className="mt-3 flex flex-wrap gap-2">{template.editableFields.map((field) => <span key={field} className="border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{field}</span>)}</div></div>
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" aria-label={'Add ' + accessibleTemplateName(template.name)} onClick={() => onAdd(template.type)}>Add {template.name}</Button></div>
  </ModalShell>;
}

function TemplateGallery({ templates, onClose, onPreview, onUse }: { templates: HomepageTemplate[]; onClose: () => void; onPreview: (template: HomepageTemplate) => void; onUse: (template: HomepageTemplate) => void; }): ReactNode {
  useEscape(onClose);
  return <ModalShell title="Template Gallery" onClose={onClose} wide>
    <div className="grid gap-4 lg:grid-cols-2">{templates.map((template) => <TemplateCard key={template.id} template={template} onPreview={onPreview} onUse={onUse} />)}</div>
  </ModalShell>;
}

function TemplateCard({ template, onPreview, onUse }: { template: HomepageTemplate; onPreview: (template: HomepageTemplate) => void; onUse: (template: HomepageTemplate) => void; }): ReactNode {
  return <article className="border border-border-subtle bg-background-primary p-4 transition hover:border-accent-gold hover:shadow-gold">
    <TemplateMockup template={template} />
    <div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-display text-2xl leading-tight">{template.name}</h3><p className="mt-2 line-clamp-2 text-sm text-text-secondary">{template.description}</p></div>{template.label ? <span className="border border-accent-gold px-2 py-1 text-[10px] uppercase text-accent-gold">{template.label}</span> : null}</div>
    <p className="mt-3 line-clamp-1 text-xs text-text-muted"><span className="text-text-secondary">Best for:</span> {template.bestFor}</p>
    <div className="mt-3 flex flex-wrap gap-2">{template.tags.map((tag) => <span key={tag} className="border border-border-subtle px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-text-muted">{tag}</span>)}</div>
    <div className="mt-4 flex gap-2"><Button type="button" variant="secondary" onClick={() => onPreview(template)}>Preview Template</Button><Button type="button" onClick={() => onUse(template)}>Use Template</Button></div>
  </article>;
}

function TemplatePreviewModal({ template, onClose, onUse }: { template: HomepageTemplate; onClose: () => void; onUse: (template: HomepageTemplate) => void; }): ReactNode {
  useEscape(onClose);
  return <ModalShell title={template.name} onClose={onClose} wide>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <TemplateMockup template={template} large />
      <div className="grid content-start gap-4">
        <p className="text-sm leading-6 text-text-secondary">{template.description}</p>
        <InfoBlock label="Recommended use" value={template.bestFor} />
        <div className="border border-border-subtle p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Sections included</p>
          <div className="mt-3 grid gap-2">{template.sections.map((section, index) => <div key={index} className="grid grid-cols-[24px_1fr] gap-2 text-sm"><span className="font-mono text-text-muted">{index + 1}</span><span className="min-w-0"><span className="block truncate text-text-primary">{getSectionTemplate(section.type).name}</span><span className="block truncate text-xs text-text-muted">{section.title}</span></span></div>)}</div>
        </div>
      </div>
    </div>
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" onClick={() => onUse(template)}>Use This Template</Button></div>
  </ModalShell>;
}

function TemplateConfirmModal({ template, onClose, onApply }: { template: HomepageTemplate; onClose: () => void; onApply: (action: TemplateAction) => void; }): ReactNode {
  useEscape(onClose);
  return <ModalShell title="Use this homepage template?" onClose={onClose}>
    <p className="text-sm leading-6 text-text-secondary">This will replace your current draft homepage sections. Your published homepage will not change until you click Publish.</p>
    <div className="mt-6 grid gap-2"><Button type="button" onClick={() => onApply('replace')}>Replace current draft</Button><Button type="button" variant="secondary" onClick={() => onApply('append')}>Append template sections below current draft</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
    <p className="mt-4 text-xs text-text-muted">{template.name} includes {template.sections.length} sections.</p>
  </ModalShell>;
}

function PublishConfirmModal({ isPublishing, onClose, onPublish }: { isPublishing: boolean; onClose: () => void; onPublish: () => void; }): ReactNode {
  useEscape(onClose);
  return <ModalShell title="Publish homepage?" onClose={onClose}>
    <p className="text-sm leading-6 text-text-secondary">This will make the current draft homepage live on the storefront. Review the Live Preview tab first if you want one last look.</p>
    <div className="mt-5 border border-border-subtle bg-background-primary p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Before publishing</p>
      <div className="mt-3 grid gap-2 text-sm text-text-secondary">
        <p>Draft sections become the published homepage.</p>
        <p>A recoverable version is created in Version History.</p>
        <p>Future edits stay as draft until you publish again.</p>
      </div>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="button" onClick={onPublish} disabled={isPublishing}><Rocket size={16} />{isPublishing ? 'Publishing' : 'Publish Homepage'}</Button>
    </div>
  </ModalShell>;
}

function ArchiveConfirmModal({ section, isArchiving, onClose, onArchive }: { section: CmsSectionDto; isArchiving: boolean; onClose: () => void; onArchive: () => void; }): ReactNode {
  useEscape(onClose);
  return <ModalShell title="Delete CMS section?" onClose={onClose}>
    <p className="text-sm leading-6 text-text-secondary">This removes the draft section from the homepage builder. The storefront will not change until you publish.</p>
    <div className="mt-5 border border-border-subtle bg-background-primary p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-accent-gold">Section</p>
      <p className="mt-2 break-words text-sm text-text-primary">{section.title}</p>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="button" variant="danger" aria-label={'Confirm delete section: ' + section.title} onClick={onArchive} disabled={isArchiving}><Trash2 size={16} />{isArchiving ? 'Deleting' : 'Delete Section'}</Button>
    </div>
  </ModalShell>;
}

function TemplateMockup({ template, large = false }: { template: HomepageTemplate; large?: boolean }): ReactNode {
  return <div className={cn('overflow-hidden border border-border-subtle bg-[#050505]', large ? 'h-[620px]' : 'h-52')}>
    <div className="h-full overflow-hidden">{template.sections.slice(0, large ? 9 : 6).map((section, index) => <TemplateMockSection key={index} section={section} index={index} large={large} />)}</div>
  </div>;
}

function TemplateMockSection({ section, index, large }: { section: CmsSectionInput; index: number; large: boolean }): ReactNode {
  const content = section.content as ContentState;
  const image = sectionImage(section, index);
  const label = getSectionTemplate(section.type).name;
  const title = section.title;
  if (section.type === 'announcement_bar' || section.type === 'marquee_strip') return <div className={cn('flex items-center justify-center border-b border-white/10 bg-[#111] px-3 font-mono uppercase tracking-[0.18em] text-accent-gold', large ? 'h-10 text-[10px]' : 'h-6 text-[7px]')}>{String(content.text || 'NEW DROP - LIMITED STOCK')}</div>;
  if (section.type === 'hero_campaign' || section.type === 'fullscreen_collection_landing') return <div className={cn('relative overflow-hidden border-b border-white/10', large ? 'h-56' : 'h-20')}>
    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
    <div className={cn('relative flex h-full flex-col justify-end', large ? 'p-8' : 'p-3')}>
      <p className={cn('uppercase tracking-[0.18em] text-accent-gold', large ? 'text-xs' : 'text-[7px]')}>{String(content.campaignLabel || label)}</p>
      <h3 className={cn('font-display leading-tight text-text-primary', large ? 'mt-3 text-5xl' : 'mt-1 truncate text-xl')}>{title}</h3>
      {large ? <p className="mt-3 max-w-xl text-sm text-text-secondary">{section.subtitle}</p> : null}
    </div>
  </div>;
  if (section.type === 'video_landing') return <div className={cn('relative flex items-center justify-center overflow-hidden border-b border-white/10 bg-black', large ? 'h-52' : 'h-20')}>
    <img src={String(content.posterImage || image)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
    <span className={cn('relative flex items-center justify-center rounded-full border border-accent-gold text-accent-gold', large ? 'h-16 w-16 text-2xl' : 'h-8 w-8 text-sm')}>▶</span>
  </div>;
  if (section.type === 'mobile_media_landing') return <div className={cn('relative flex items-end justify-center overflow-hidden border-b border-white/10 bg-black', large ? 'h-52' : 'h-20')}>
    {String(content.imageUrl || content.posterImage || '') ? <img src={String(content.imageUrl || content.posterImage)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" /> : null}
    <span className={cn('relative mb-3 px-3 py-1 uppercase tracking-[0.2em] text-[#f0d9ae] drop-shadow-[0_0_7px_rgba(200,169,126,0.65)]', large ? 'text-xs' : 'text-[7px]')}>{String(content.ctaText || 'Mobile only')}</span>
  </div>;
  if (section.type === 'limited_drop_timer') return <div className={cn('border-b border-white/10 bg-[#10100f] text-center', large ? 'p-8' : 'p-3')}>
    <p className={cn('uppercase tracking-[0.16em] text-accent-gold', large ? 'text-xs' : 'text-[7px]')}>{String(content.label || 'Limited Drop')}</p>
    <h3 className={cn('font-display text-text-primary', large ? 'mt-3 text-3xl' : 'mt-1 truncate text-sm')}>{title}</h3>
    <div className={cn('mx-auto grid max-w-sm grid-cols-3 gap-2 font-mono text-text-primary', large ? 'mt-5 text-2xl' : 'mt-2 text-[10px]')}><span className="border border-white/15 p-2">02</span><span className="border border-white/15 p-2">14</span><span className="border border-white/15 p-2">39</span></div>
  </div>;
  if (['product_carousel', 'hot_drop', 'trending_now', 'featured_collection', 'recently_viewed', 'best_sellers'].includes(section.type)) return <div className={cn('border-b border-white/10 bg-[#0b0b0b]', large ? 'p-6' : 'p-2')}>
    <div className="flex items-center justify-between gap-3"><p className={cn('uppercase tracking-[0.16em] text-accent-gold', large ? 'text-xs' : 'text-[7px]')}>{label}</p>{section.type === 'hot_drop' ? <span className="border border-accent-gold/50 px-2 py-1 text-[8px] uppercase text-accent-gold">Limited</span> : null}</div>
    <h3 className={cn('font-display text-text-primary', large ? 'mt-2 text-3xl' : 'mt-1 truncate text-sm')}>{title}</h3>
    <div className={cn('grid grid-cols-4 gap-2', large ? 'mt-5' : 'mt-2')}>{mockProductImages.map((productImage, productIndex) => <div key={productImage} className="min-w-0 border border-white/10 bg-white/[0.04]"><div className="aspect-[3/4] overflow-hidden"><img src={productImage} alt="" className="h-full w-full object-cover opacity-85" /></div>{large ? <div className="p-2"><p className="truncate text-xs text-text-primary">{['Transit Jacket', 'Ribbed Tank', 'Wide Trouser', 'Leather Tote'][productIndex]}</p><p className="mt-1 font-mono text-[10px] text-accent-gold">Rs. {['4,999', '2,499', '3,999', '6,299'][productIndex]}</p></div> : null}</div>)}</div>
  </div>;
  if (section.type === 'category_editorial_grid') return <div className={cn('grid grid-cols-4 gap-px border-b border-white/10 bg-black', large ? 'h-40' : 'h-12')}>{String(content.tiles || '').split('\n').slice(0, 4).map((tile, tileIndex) => { const [tileLabel, tileImage] = tile.split('|'); return <div key={tile || tileIndex} className="relative overflow-hidden bg-white/10"><img src={tileImage || mockProductImages[tileIndex]} alt="" className="h-full w-full object-cover opacity-70" /><span className="absolute bottom-2 left-2 font-display text-xs text-text-primary">{tileLabel}</span></div>; })}</div>;
  if (section.type === 'shop_the_look') return <div className={cn('grid border-b border-white/10 bg-[#090909]', large ? 'grid-cols-[1.2fr_0.8fr]' : 'grid-cols-2')}><div className={cn('relative overflow-hidden', large ? 'h-52' : 'h-16')}><img src={image} alt="" className="h-full w-full object-cover opacity-75" /><span className="absolute left-[42%] top-[34%] h-3 w-3 rounded-full border-2 border-black bg-accent-gold" /><span className="absolute bottom-[24%] left-[58%] h-3 w-3 rounded-full border-2 border-black bg-accent-gold" /></div><div className={cn(large ? 'p-6' : 'p-2')}><p className={cn('uppercase tracking-[0.16em] text-accent-gold', large ? 'text-xs' : 'text-[7px]')}>Shop The Look</p><h3 className={cn('font-display text-text-primary', large ? 'mt-3 text-3xl' : 'mt-1 truncate text-sm')}>{title}</h3></div></div>;
  if (section.type === 'newsletter' || section.type === 'popup_campaign') return <div className={cn('border-b border-white/10 bg-[#101010] text-center', large ? 'p-8' : 'p-3')}><h3 className={cn('font-display text-text-primary', large ? 'text-3xl' : 'truncate text-sm')}>{title}</h3><div className={cn('mx-auto mt-3 flex max-w-md border border-white/20', large ? 'h-10' : 'h-5')}><span className="flex-1" /><span className="w-20 bg-accent-gold" /></div></div>;
  return <div className={cn('grid border-b border-white/10 bg-[#0b0b0b]', large ? 'grid-cols-2' : 'grid-cols-[1fr_0.8fr]')}><div className={cn(large ? 'p-6' : 'p-2')}><p className={cn('uppercase tracking-[0.16em] text-accent-gold', large ? 'text-xs' : 'text-[7px]')}>{label}</p><h3 className={cn('font-display text-text-primary', large ? 'mt-3 text-3xl' : 'mt-1 truncate text-sm')}>{title}</h3>{large ? <p className="mt-3 text-sm text-text-secondary">{String(content.founderNote || section.subtitle || '')}</p> : null}</div><div className={cn('overflow-hidden', large ? 'h-48' : 'h-14')}><img src={image} alt="" className="h-full w-full object-cover opacity-75" /></div></div>;
}

function ModalShell({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; }): ReactNode {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className={cn('max-h-[90vh] overflow-auto border border-accent-gold/40 bg-background-elevated p-5 shadow-gold', wide ? 'w-full max-w-5xl' : 'w-full max-w-2xl')}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-3xl">{title}</h2><button ref={closeRef} type="button" aria-label="Close modal" className="flex h-10 w-10 items-center justify-center border border-border-subtle text-text-secondary hover:text-text-primary" onClick={onClose}><X size={17} /></button></div>
      <div className="mt-5">{children}</div>
    </div>
  </div>;
}

function InfoBlock({ label, value }: { label: string; value: string }): ReactNode {
  return <div className="border border-border-subtle p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-accent-gold">{label}</p><p className="mt-2 text-sm text-text-secondary">{value}</p></div>;
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
      <Input label="Alt Text" value={draft.alt ?? ''} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} />
      <Button type="button" disabled={isSaving || !draft.url} onClick={() => onCreate(draft)}>{isSaving ? COPY.common.loading : 'Save Media'}</Button>
    </div>
    <div className="mt-5 grid max-h-56 gap-2 overflow-auto">{media.slice(0, 8).map((item) => <button key={item.id ?? item._id ?? item.url} type="button" className="truncate border border-border-subtle px-3 py-2 text-left text-xs text-text-secondary hover:text-text-primary" onClick={() => navigator.clipboard?.writeText(item.url)}>{item.type} / {item.alt || item.url}</button>)}</div>
  </div>;
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }): ReactNode {
  return <div className="border border-border bg-background-elevated p-4"><span className="text-accent-gold">{icon}</span><p className="mt-3 font-mono text-2xl">{value}</p><p className="text-xs uppercase tracking-[0.12em] text-text-secondary">{label}</p></div>;
}

function ContentInput({ name, value, onChange }: { name: string; value: ContentValue; onChange: (value: ContentValue) => void; }): ReactNode {
  const label = name.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => match.toUpperCase());
  if (name === 'mediaType') return <SelectField label={label} options={[{ label: 'Image', value: 'image' }, { label: 'Video', value: 'video' }]} value={String(value)} onChange={(event) => onChange(event.target.value)} />;
  if (typeof value === 'boolean') return <SelectField label={label} options={boolOptions} value={String(value)} onChange={(event) => onChange(event.target.value === 'true')} />;
  const multiline = ['slides', 'tiles', 'scenes', 'pressLogos', 'ugcImages', 'hotspotLabels'].includes(name);
  if (multiline) return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary md:col-span-2"><span>{label}</span><textarea className="mt-2 min-h-28 w-full border border-border-subtle bg-background-input px-4 py-3 text-sm normal-case tracking-normal text-text-primary" value={String(value)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} /></label>;
  return <Input label={label} type={typeof value === 'number' ? 'number' : 'text'} value={String(value)} onChange={(event) => onChange(typeof value === 'number' ? Number(event.target.value) : event.target.value)} />;
}

function useEscape(onClose: () => void): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);
}

function toInput(section?: CmsSectionDto): CmsSectionInput {
  if (section) return sectionDtoToInput(section);
  return {
    pageTarget: 'home',
    type: 'hero_campaign',
    title: getSectionTemplate('hero_campaign').name,
    subtitle: '',
    description: getSectionTemplate('hero_campaign').description,
    content: getSectionTemplate('hero_campaign').defaults,
    styles: {},
    products: [],
    categories: [],
    sortOrder: 0,
    active: true,
    hideOnDesktop: false,
    hideOnMobile: false,
    status: 'draft',
    startDate: today(),
    endDate: nextMonth()
  };
}
