// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Check, ImageIcon, Pencil, Power, RotateCcw, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { CATEGORY_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useArchiveCategory, useCreateCategory, useUpdateCategory } from '@/hooks/useAdminMutations';
import { adminCategorySchema } from '@/lib/schemas';
import { slugify } from '@/lib/utils';
import type { CategoryDto } from '@/types/dto.types';

export interface CategoryManagerProps {
  categories: CategoryDto[];
  isLoading: boolean;
}

type CategoryFormValues = z.infer<typeof adminCategorySchema>;
type Mode = 'create' | 'edit';
type Toast = { tone: 'success' | 'error'; message: string } | null;

const categoryId = (category: CategoryDto): string => category.id ?? category._id ?? category.slug;
const collapseRepeatedSlug = (value: string): string => {
  for (let size = 1; size <= value.length / 2; size += 1) {
    if (value.length % size === 0) {
      const part = value.slice(0, size);
      if (part && part.repeat(value.length / size) === value) return part;
    }
  }
  return value;
};
const normalizeCategorySlug = (value: string, fallback: string): string => {
  const normalized = collapseRepeatedSlug(slugify(value || fallback));
  const fallbackSlug = slugify(fallback);
  if (fallbackSlug && normalized.startsWith(fallbackSlug + fallbackSlug)) return fallbackSlug + normalized.slice((fallbackSlug + fallbackSlug).length);
  return normalized;
};
const emptyCategoryValues: CategoryFormValues = { name: '', slug: '', parent: '', image: CATEGORY_FORM_DEFAULTS.image, description: '', heroTitle: '', heroSubtitle: '', heroImage: '', mobileHeroImage: '', bannerImage: '', mobileBannerImage: '', thumbnailImage: '', categoryCardImage: '', categoryVideo: '', mobileCategoryVideo: '', backgroundVideo: '', videoPosterImage: '', imageAltText: '', videoAutoplay: true, videoMuted: true, videoLoop: true, sortOrder: CATEGORY_FORM_DEFAULTS.sortOrder, isActive: CATEGORY_FORM_DEFAULTS.isActive, isVisible: true, isPublished: true, isFeatured: false, showInHeader: true, showInMenu: true, showInFilters: true, showOnHomepage: false, showOnCollectionPages: true, showInFooter: false, bannerTitle: '', bannerSubtitle: '', defaultSort: 'newest', defaultGridView: 4, areFiltersVisible: true, isAdvancedFilterEnabled: true, isFlashlightEnabled: true, seoTitle: '', seoDescription: '', ogImage: '', canonicalSlug: '' };
const categoryValues = (category?: CategoryDto): CategoryFormValues => ({
  name: category?.name ?? emptyCategoryValues.name,
  slug: category?.slug ?? emptyCategoryValues.slug,
  parent: category?.parent ?? '',
  image: category?.image ?? CATEGORY_FORM_DEFAULTS.image,
  description: category?.description ?? '',
  heroTitle: category?.heroTitle ?? '',
  heroSubtitle: category?.heroSubtitle ?? '',
  heroImage: category?.heroImage ?? '',
  mobileHeroImage: category?.mobileHeroImage ?? '',
  bannerImage: category?.bannerImage ?? '',
  mobileBannerImage: category?.mobileBannerImage ?? '',
  thumbnailImage: category?.thumbnailImage ?? '',
  categoryCardImage: category?.categoryCardImage ?? '',
  categoryVideo: category?.categoryVideo ?? '',
  mobileCategoryVideo: category?.mobileCategoryVideo ?? '',
  backgroundVideo: category?.backgroundVideo ?? '',
  videoPosterImage: category?.videoPosterImage ?? '',
  imageAltText: category?.imageAltText ?? '',
  videoAutoplay: category?.videoAutoplay ?? true,
  videoMuted: category?.videoMuted ?? true,
  videoLoop: category?.videoLoop ?? true,
  sortOrder: category?.sortOrder ?? CATEGORY_FORM_DEFAULTS.sortOrder,
  isActive: category?.isActive ?? CATEGORY_FORM_DEFAULTS.isActive,
  isVisible: category?.isVisible ?? true,
  isPublished: category?.isPublished ?? true,
  isFeatured: category?.isFeatured ?? false,
  showInHeader: category?.showInHeader ?? true,
  showInMenu: category?.showInMenu ?? true,
  showInFilters: category?.showInFilters ?? true,
  showOnHomepage: category?.showOnHomepage ?? false,
  showOnCollectionPages: category?.showOnCollectionPages ?? true,
  showInFooter: category?.showInFooter ?? false,
  bannerTitle: category?.bannerTitle ?? '',
  bannerSubtitle: category?.bannerSubtitle ?? '',
  defaultSort: category?.defaultSort as CategoryFormValues['defaultSort'] ?? 'newest',
  defaultGridView: category?.defaultGridView ?? 4,
  areFiltersVisible: category?.areFiltersVisible ?? true,
  isAdvancedFilterEnabled: category?.isAdvancedFilterEnabled ?? true,
  isFlashlightEnabled: category?.isFlashlightEnabled ?? true,
  seoTitle: category?.seoTitle ?? '',
  seoDescription: category?.seoDescription ?? '',
  ogImage: category?.ogImage ?? '',
  canonicalSlug: category?.canonicalSlug ?? ''
});

export function CategoryManager({ categories, isLoading }: CategoryManagerProps): ReactNode {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<Toast>(null);
  const selectedCategory = useMemo(() => categories.find((category) => categoryId(category) === editingId), [categories, editingId]);
  const mode: Mode = selectedCategory ? 'edit' : 'create';
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<CategoryFormValues>({ resolver: zodResolver(adminCategorySchema), defaultValues: emptyCategoryValues });
  const image = watch('image');
  const categoryVideo = watch('categoryVideo');

  useEffect(() => {
    reset(categoryValues(selectedCategory));
  }, [reset, selectedCategory]);

  const visibleCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((category) => [category.name, category.slug].join(' ').toLowerCase().includes(needle));
  }, [categories, query]);

  const stats = useMemo(() => ({
    total: categories.length,
    active: categories.filter((category) => category.isActive).length,
    hidden: categories.filter((category) => !category.isActive).length
  }), [categories]);

  const onSubmit = (data: CategoryFormValues): void => {
    const payload = { ...data, slug: normalizeCategorySlug(data.slug, data.name) };
    if (selectedCategory) {
      updateCategory.mutate(
        { ...payload, id: categoryId(selectedCategory) },
        {
          onSuccess: () => {
            setEditingId(null);
            setToast({ tone: 'success', message: 'Category updated.' });
            window.setTimeout(() => setToast(null), 2600);
          },
          onError: (error) => setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Category update failed.' })
        }
      );
      return;
    }
    createCategory.mutate(payload, {
      onSuccess: () => {
        reset(emptyCategoryValues);
        setToast({ tone: 'success', message: COPY.categories.created });
        window.setTimeout(() => setToast(null), 2600);
      },
      onError: (error) => setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Category save failed.' })
    });
  };

  const onEdit = (category: CategoryDto): void => setEditingId(categoryId(category));
  const onCancel = (): void => { setEditingId(null); reset(emptyCategoryValues); };
  const onArchive = (id: string): void => {
    if (window.confirm(COPY.common.confirmArchive)) {
      archiveCategory.mutate(id, {
        onSuccess: () => setToast({ tone: 'success', message: 'Category archived.' }),
        onError: (error) => setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Category archive failed.' })
      });
    }
  };
  const onToggle = (category: CategoryDto): void => {
    updateCategory.mutate(
      { ...categoryValues(category), id: categoryId(category), isActive: !category.isActive },
      {
        onSuccess: () => setToast({ tone: 'success', message: category.isActive ? 'Category hidden.' : 'Category shown.' }),
        onError: (error) => setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Category visibility update failed.' })
      }
    );
  };

  return <section className="grid gap-6">
    {toast ? <div className={(toast.tone === 'success' ? 'border-success text-success' : 'border-danger text-danger') + ' fixed right-5 top-5 z-50 border bg-background-elevated px-4 py-3 text-sm shadow-lg'}>{toast.tone === 'success' ? <Check size={14} className="mr-2 inline" /> : null}{toast.message}</div> : null}
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard label="Total categories" value={stats.total} />
      <StatCard label="Visible storefront paths" value={stats.active} tone="success" />
      <StatCard label="Hidden categories" value={stats.hidden} tone="neutral" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(440px,520px)_1fr]">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">{mode === 'edit' ? 'Edit Category' : 'New Category'}</p>
            <h2 className="mt-2 font-display text-2xl text-text-primary">{mode === 'edit' ? selectedCategory?.name : COPY.categories.form}</h2>
          </div>
          {mode === 'edit' ? <button type="button" aria-label="Cancel edit" onClick={onCancel} className="grid h-10 w-10 place-items-center border border-border text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"><X size={16} /></button> : null}
        </div>

        <div className="grid gap-3">
          <CategoryFormGroup title="Basic Info" helper="Name, slug, and short storefront copy." open>
            <Input label="Category Name" error={formState.errors.name?.message} {...register('name')} />
            <Input label="Category Slug" error={formState.errors.slug?.message} {...register('slug')} />
            <Input label="Category Description" error={formState.errors.description?.message} {...register('description')} />
            <Input label="Banner Title" error={formState.errors.bannerTitle?.message} {...register('bannerTitle')} />
            <Input label="Banner Subtitle" error={formState.errors.bannerSubtitle?.message} {...register('bannerSubtitle')} />
          </CategoryFormGroup>

          <CategoryFormGroup title="Hierarchy" helper="Parent category placement and ordering in menus, filters, and category trees.">
            <SelectField label="Parent Category" options={[{ label: 'None', value: '' }, ...categories.filter((category) => categoryId(category) !== editingId).map((category) => ({ label: category.name, value: categoryId(category) }))]} value={watch('parent') ?? ''} onChange={(event) => setValue('parent', event.target.value)} />
            <Input label={COPY.fields.sortOrder} type="number" error={formState.errors.sortOrder?.message} {...register('sortOrder')} />
            <Input label="Category Canonical Slug" error={formState.errors.canonicalSlug?.message} {...register('canonicalSlug')} />
          </CategoryFormGroup>

          <CategoryFormGroup title="Media" helper="Images, videos, poster artwork, and accessibility text.">
            <Input label={COPY.fields.image} error={formState.errors.image?.message} {...register('image')} />
            <Input label="Hero Title" error={formState.errors.heroTitle?.message} {...register('heroTitle')} />
            <Input label="Hero Subtitle" error={formState.errors.heroSubtitle?.message} {...register('heroSubtitle')} />
            <Input label="Hero Image" error={formState.errors.heroImage?.message} {...register('heroImage')} />
            <Input label="Mobile Hero Image" error={formState.errors.mobileHeroImage?.message} {...register('mobileHeroImage')} />
            <Input label="Banner Image" error={formState.errors.bannerImage?.message} {...register('bannerImage')} />
            <Input label="Mobile Banner Image" error={formState.errors.mobileBannerImage?.message} {...register('mobileBannerImage')} />
            <Input label="Thumbnail Image" error={formState.errors.thumbnailImage?.message} {...register('thumbnailImage')} />
            <Input label="Category Card Image" error={formState.errors.categoryCardImage?.message} {...register('categoryCardImage')} />
            <Input label="Category Video" error={formState.errors.categoryVideo?.message} {...register('categoryVideo')} />
            <Input label="Mobile Category Video" error={formState.errors.mobileCategoryVideo?.message} {...register('mobileCategoryVideo')} />
            <Input label="Background Video" error={formState.errors.backgroundVideo?.message} {...register('backgroundVideo')} />
            <Input label="Video Poster Image" error={formState.errors.videoPosterImage?.message} {...register('videoPosterImage')} />
            <Input label="Image Alt Text" error={formState.errors.imageAltText?.message} {...register('imageAltText')} />
            <SelectField label="Video Autoplay" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('videoAutoplay') ? 'true' : 'false'} onChange={(event) => setValue('videoAutoplay', event.target.value === 'true')} />
            <SelectField label="Video Muted" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('videoMuted') ? 'true' : 'false'} onChange={(event) => setValue('videoMuted', event.target.value === 'true')} />
            <SelectField label="Video Loop" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('videoLoop') ? 'true' : 'false'} onChange={(event) => setValue('videoLoop', event.target.value === 'true')} />
          </CategoryFormGroup>

          <CategoryFormGroup title="Storefront Visibility" helper="Publication, menu, filter, homepage, collection, and footer placement.">
            <SelectField label={COPY.fields.active} options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isActive') ? 'true' : 'false'} onChange={(event) => setValue('isActive', event.target.value === 'true')} />
            <SelectField label="Storefront Visible" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isVisible') ? 'true' : 'false'} onChange={(event) => setValue('isVisible', event.target.value === 'true')} />
            <SelectField label="Published" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isPublished') ? 'true' : 'false'} onChange={(event) => setValue('isPublished', event.target.value === 'true')} />
            <SelectField label="Featured" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isFeatured') ? 'true' : 'false'} onChange={(event) => setValue('isFeatured', event.target.value === 'true')} />
            <SelectField label="Show In Header" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showInHeader') ? 'true' : 'false'} onChange={(event) => setValue('showInHeader', event.target.value === 'true')} />
            <SelectField label="Show In Menu" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showInMenu') ? 'true' : 'false'} onChange={(event) => setValue('showInMenu', event.target.value === 'true')} />
            <SelectField label="Show In Filters" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showInFilters') ? 'true' : 'false'} onChange={(event) => setValue('showInFilters', event.target.value === 'true')} />
            <SelectField label="Homepage" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showOnHomepage') ? 'true' : 'false'} onChange={(event) => setValue('showOnHomepage', event.target.value === 'true')} />
            <SelectField label="Collection Pages" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showOnCollectionPages') ? 'true' : 'false'} onChange={(event) => setValue('showOnCollectionPages', event.target.value === 'true')} />
            <SelectField label="Footer" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('showInFooter') ? 'true' : 'false'} onChange={(event) => setValue('showInFooter', event.target.value === 'true')} />
          </CategoryFormGroup>

          <CategoryFormGroup title="Page Settings" helper="Default browsing controls for category and collection surfaces.">
            <SelectField label="Default Sort" options={[{ label: 'Newest', value: 'newest' }, { label: 'Price low-high', value: 'price-asc' }, { label: 'Price high-low', value: 'price-desc' }, { label: 'Best selling', value: 'best-selling' }, { label: 'Top rated', value: 'top-rated' }]} value={watch('defaultSort')} onChange={(event) => setValue('defaultSort', event.target.value as CategoryFormValues['defaultSort'])} />
            <SelectField label="Default Grid" options={[{ label: '4-grid', value: '4' }, { label: '2-grid', value: '2' }, { label: '1-grid', value: '1' }]} value={String(watch('defaultGridView'))} onChange={(event) => setValue('defaultGridView', Number(event.target.value) as CategoryFormValues['defaultGridView'])} />
            <SelectField label="Filters Visible" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('areFiltersVisible') ? 'true' : 'false'} onChange={(event) => setValue('areFiltersVisible', event.target.value === 'true')} />
            <SelectField label="Advanced Filters" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isAdvancedFilterEnabled') ? 'true' : 'false'} onChange={(event) => setValue('isAdvancedFilterEnabled', event.target.value === 'true')} />
            <SelectField label="Flashlight" options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isFlashlightEnabled') ? 'true' : 'false'} onChange={(event) => setValue('isFlashlightEnabled', event.target.value === 'true')} />
          </CategoryFormGroup>

          <CategoryFormGroup title="SEO" helper="Search metadata and social preview artwork.">
            <Input label="SEO Title" error={formState.errors.seoTitle?.message} {...register('seoTitle')} />
            <Input label="SEO Description" error={formState.errors.seoDescription?.message} {...register('seoDescription')} />
            <Input label="OG Image" error={formState.errors.ogImage?.message} {...register('ogImage')} />
          </CategoryFormGroup>
        </div>

        <div className="overflow-hidden border border-border bg-background-primary">
          {image ? <img src={image} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center text-text-muted"><ImageIcon size={24} /></div>}
        </div>
        {categoryVideo ? <div className="overflow-hidden border border-border bg-background-primary">
          <video src={categoryVideo} poster={watch('videoPosterImage') || image} className="aspect-[16/9] w-full object-cover" muted controls />
        </div> : null}

        <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap gap-3 border-t border-border bg-background-elevated/95 px-5 py-4 backdrop-blur">
          <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}><Save size={15} className="mr-2" />{createCategory.isPending || updateCategory.isPending ? COPY.common.loading : mode === 'edit' ? 'Save Category' : COPY.common.save}</Button>
          {mode === 'edit' ? <Button type="button" variant="secondary" onClick={onCancel}><RotateCcw size={15} className="mr-2" />Cancel</Button> : null}
        </div>
      </form>

      <div className="min-w-0 border border-border bg-background-elevated shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-display text-2xl text-text-primary">Category Library</h2>
            <p className="mt-1 text-sm text-text-secondary">Manage storefront navigation, CMS category grids, and product filtering from one place.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search categories</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search categories..." className="h-11 w-full border border-border bg-background-input px-3 text-sm text-text-primary outline-none transition focus:border-accent-gold" />
          </label>
        </div>

        {!isLoading && categories.length === 0 ? <div className="p-5"><EmptyPanel title={COPY.categories.title} message={COPY.categories.empty} /></div> : <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-text-secondary">
              <tr>
                <th className="border-b border-border p-4">{COPY.fields.name}</th>
                <th className="border-b border-border p-4">{COPY.fields.slug}</th>
                <th className="border-b border-border p-4">Path</th>
                <th className="border-b border-border p-4">{COPY.fields.sortOrder}</th>
                <th className="border-b border-border p-4">{COPY.fields.status}</th>
                <th className="border-b border-border p-4 text-right">{COPY.table.columns[3]}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={6}>{COPY.common.loading}</td></tr> : visibleCategories.map((category) => {
                const id = categoryId(category);
                return <tr key={id} className="border-b border-border-subtle transition hover:bg-background-overlay/60">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {category.image ? <img src={category.image} alt="" className="h-12 w-12 border border-border object-cover" /> : <div className="grid h-12 w-12 place-items-center border border-border text-text-muted"><ImageIcon size={16} /></div>}
                      <span className="font-medium text-text-primary">{category.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">{category.slug}</td>
                  <td className="p-4 text-text-secondary">{category.path ?? category.slug}</td>
                  <td className="p-4 text-text-secondary">{category.sortOrder}</td>
                  <td className="p-4"><StatusPill tone={category.isActive ? 'success' : 'neutral'}>{category.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <IconAction label="Edit category" onClick={() => onEdit(category)}><Pencil size={15} /></IconAction>
                      <IconAction label={category.isActive ? 'Hide category' : 'Show category'} onClick={() => onToggle(category)} disabled={updateCategory.isPending}><Power size={15} /></IconAction>
                      <IconAction label="Archive category" tone="danger" onClick={() => onArchive(id)} disabled={archiveCategory.isPending}><Archive size={15} /></IconAction>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  </section>;
}

function CategoryFormGroup({ title, helper, children, open = true }: { title: string; helper: string; children: ReactNode; open?: boolean }): ReactNode {
  return <details open={open} className="group border border-border bg-background-primary">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 marker:hidden">
      <span>
        <span className="block font-display text-xl text-text-primary">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-text-secondary">{helper}</span>
      </span>
      <span className="mt-1 shrink-0 font-mono text-xs uppercase tracking-[0.12em] text-accent-gold group-open:hidden">Open</span>
      <span className="mt-1 hidden shrink-0 font-mono text-xs uppercase tracking-[0.12em] text-text-muted group-open:block">Close</span>
    </summary>
    <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{children}</div>
  </details>;
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'success' }): ReactNode {
  return <div className="border border-border bg-background-elevated p-4 shadow-lg">
    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">{label}</p>
    <p className={tone === 'success' ? 'mt-2 font-mono text-2xl text-success' : 'mt-2 font-mono text-2xl text-text-primary'}>{value}</p>
  </div>;
}

function IconAction({ label, children, onClick, disabled, tone = 'neutral' }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'neutral' | 'danger' }): ReactNode {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={(tone === 'danger' ? 'text-danger hover:border-danger hover:bg-danger/10' : 'text-text-secondary hover:border-accent-gold hover:text-accent-gold') + ' grid h-10 w-10 place-items-center border border-border bg-background-primary transition disabled:cursor-not-allowed disabled:opacity-50'}>
    {children}
  </button>;
}
