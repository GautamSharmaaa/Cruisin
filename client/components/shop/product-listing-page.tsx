// Governed by .rules v1.0
'use client';

import { SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdvancedFiltersDrawer, type AdvancedFilterValues } from '@/components/shop/advanced-filters-drawer';
import { CollectionCarousel } from '@/components/collections/collection-carousel';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterChips, type FilterChip } from '@/components/shop/filter-chips';
import { FlashlightToggle } from '@/components/shop/flashlight-toggle';
import { GridViewToggle } from '@/components/shop/grid-view-toggle';
import { ProductGrid, type GridView } from '@/components/shop/product-grid';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { SortSelect } from '@/components/shop/sort-select';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useCategoryByPath, useCategories } from '@/hooks/useCategories';
import { useCollections, usePageSettings, useSiteSettings, useTags } from '@/hooks/useMerchandising';
import { useProducts, type UseProductsInput } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import type { CollectionDto, PageSettingsDto } from '@/types/dto.types';

export interface ProductListingPageProps {
  pageType: string;
  pageSlug: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  gender?: 'men' | 'women' | 'unisex';
  sale?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  latestDrop?: boolean;
  categoryPath?: string;
  collectionSlug?: string;
  selectedCollection?: CollectionDto | null;
  showCollectionCarousel?: boolean;
}

const gridViews: GridView[] = [1, 2, 4];
const emptyValues: AdvancedFilterValues = { category: '', collection: '', gender: '', size: '', color: '', priceMin: '', priceMax: '', availability: 'all', sale: false, sort: 'newest' };

const storedGridView = (fallback: GridView): GridView => {
  if (typeof window === 'undefined') return fallback;
  const saved = Number(window.localStorage.getItem('cruisin_grid_view'));
  return gridViews.includes(saved as GridView) ? saved as GridView : fallback;
};

const defaultGridView = (settings?: { defaultGridView?: GridView } | null, siteDefault?: GridView): GridView => {
  if (settings?.defaultGridView) return settings.defaultGridView;
  if (siteDefault) return siteDefault;
  if (typeof window !== 'undefined' && window.innerWidth < 640) return 2;
  if (typeof window !== 'undefined' && window.innerWidth < 1024) return 2;
  return 4;
};

const titleFromSlug = (slug: string): string => slug.split('/').at(-1)?.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') ?? slug;

export function ProductListingPage({ pageType, pageSlug, eyebrow = COPY.shop.eyebrow, title, subtitle, gender, sale, featured, bestseller, latestDrop, categoryPath, collectionSlug, selectedCollection = null, showCollectionCarousel = false }: ProductListingPageProps): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const categories = useCategories();
  const category = useCategoryByPath(categoryPath);
  const collections = useCollections();
  const siteSettings = useSiteSettings();
  const pageSettings = usePageSettings(pageType, pageSlug);
  const tags = useTags();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [limit, setLimit] = useState(24);
  const [spotlight, setSpotlight] = useState(false);
  const [view, setView] = useState<GridView>(4);
  const settings = pageSettings.data;
  const categoryData = category.data;
  const browsingSettings = {
    defaultSort: selectedCollection?.defaultSort ?? categoryData?.defaultSort ?? settings?.defaultSort ?? 'newest',
    defaultGridView: selectedCollection?.defaultGridView ?? categoryData?.defaultGridView ?? settings?.defaultGridView,
    areFiltersVisible: selectedCollection?.areFiltersVisible ?? categoryData?.areFiltersVisible ?? settings?.areFiltersVisible ?? true,
    isAdvancedFilterEnabled: selectedCollection?.isAdvancedFilterEnabled ?? categoryData?.isAdvancedFilterEnabled ?? settings?.isAdvancedFilterEnabled ?? true,
    isFlashlightEnabled: selectedCollection?.isFlashlightEnabled ?? categoryData?.isFlashlightEnabled ?? settings?.isFlashlightEnabled ?? true
  };
  const sort = params.get('sort') ?? browsingSettings.defaultSort;
  const activeCategory = categoryPath ?? params.get('category') ?? undefined;
  const activeCollection = collectionSlug ?? params.get('collection') ?? undefined;
  const activeTags = params.get('tags') ?? undefined;
  const activeGender = (params.get('gender') as 'men' | 'women' | 'unisex' | null) ?? gender;
  const activeSale = sale || params.get('sale') === 'true';

  const [draft, setDraft] = useState<AdvancedFilterValues>(emptyValues);

  useEffect(() => {
    const fallback = defaultGridView(browsingSettings, siteSettings.data?.defaultGridView);
    setView(storedGridView(fallback));
  }, [browsingSettings.defaultGridView, siteSettings.data?.defaultGridView]);

  useEffect(() => {
    setDraft({
      category: params.get('category') ?? '',
      collection: params.get('collection') ?? '',
      gender: params.get('gender') ?? '',
      size: params.get('size') ?? '',
      color: params.get('color') ?? '',
      priceMin: params.get('priceMin') ?? '',
      priceMax: params.get('priceMax') ?? '',
      availability: params.get('availability') ?? 'all',
      sale: params.get('sale') === 'true',
      sort
    });
  }, [params, sort]);

  const products = useProducts({
    category: activeCategory,
    collection: activeCollection,
    tags: activeTags,
    gender: activeGender,
    sale: activeSale ? true : undefined,
    featured: featured ? true : undefined,
    bestseller: bestseller ? true : undefined,
    latestDrop: latestDrop ? true : undefined,
    size: params.get('size') ?? undefined,
    color: params.get('color') ?? undefined,
    priceMin: params.get('priceMin') ? Number(params.get('priceMin')) : undefined,
    priceMax: params.get('priceMax') ? Number(params.get('priceMax')) : undefined,
    availability: (params.get('availability') as UseProductsInput['availability']) ?? 'all',
    sort,
    limit
  });

  const items = products.data?.items ?? [];
  const total = products.data?.total ?? items.length;
  const heroImage = selectedCollection?.heroImage || settings?.heroImage || categoryData?.heroImage || categoryData?.image;
  const mobileHeroImage = selectedCollection?.mobileHeroImage || selectedCollection?.mobileImage || settings?.mobileHeroImage || categoryData?.mobileHeroImage || heroImage;
  const heroVideo = selectedCollection?.collectionVideo || settings?.heroVideo || categoryData?.categoryVideo || categoryData?.backgroundVideo;
  const mobileHeroVideo = selectedCollection?.mobileCollectionVideo || settings?.mobileHeroVideo || categoryData?.mobileCategoryVideo || heroVideo;
  const videoPoster = selectedCollection?.videoPosterImage || settings?.videoPosterImage || categoryData?.videoPosterImage || mobileHeroImage || heroImage;
  const pageTitle = selectedCollection?.heroTitle || selectedCollection?.title || categoryData?.heroTitle || categoryData?.name || settings?.title || title || titleFromSlug(pageSlug);
  const pageSubtitle = selectedCollection?.heroSubtitle || selectedCollection?.description || categoryData?.heroSubtitle || categoryData?.description || settings?.subtitle || subtitle || '';
  const bannerVisible = selectedCollection?.isBannerVisible ?? settings?.isBannerVisible ?? Boolean(categoryData?.bannerImage || categoryData?.bannerTitle);
  const bannerImage = selectedCollection?.bannerImage || settings?.bannerImage || categoryData?.bannerImage;
  const mobileBannerImage = selectedCollection?.mobileBannerImage || settings?.mobileBannerImage || categoryData?.mobileBannerImage || bannerImage;
  const bannerVideo = settings?.bannerVideo;
  const mobileBannerVideo = settings?.mobileBannerVideo || bannerVideo;
  const bannerTitle = categoryData?.bannerTitle || settings?.ctaText || pageTitle;
  const bannerSubtitle = categoryData?.bannerSubtitle || settings?.subtitle || '';
  const filtersVisible = browsingSettings.areFiltersVisible;
  const advancedVisible = browsingSettings.isAdvancedFilterEnabled && (siteSettings.data?.isAdvancedFilterEnabled ?? true);
  const flashlightVisible = browsingSettings.isFlashlightEnabled && (siteSettings.data?.isFlashlightEnabled ?? true);

  const chips = useMemo<FilterChip[]>(() => {
    const sourceTags: FilterChip[] = (tags.data ?? []).filter((tag) => tag.isVisible).map((tag) => ({ label: tag.name, value: tag.slug, kind: tag.slug === 'view-all' ? 'clear' : 'tag' }));
    if (sourceTags.length > 0) return sourceTags;
    return [{ label: 'View All', value: 'view-all', kind: 'clear' }, ...(categories.data ?? []).filter((item) => item.showInFilters !== false).map((item) => ({ label: item.name, value: item.path ?? item.slug, kind: 'category' as const }))];
  }, [categories.data, tags.data]);

  const pushParams = (updates: Record<string, string | null>): void => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key); else next.set(key, value);
    });
    const query = next.toString();
    router.push(query ? pathname + '?' + query : pathname);
  };

  const selectChip = (chip: FilterChip): void => {
    if (chip.kind === 'clear') {
      pushParams({ category: null, tags: null });
      return;
    }
    pushParams(chip.kind === 'category' ? { category: chip.value, tags: null } : { tags: chip.value, category: null });
  };

  const updateSort = (value: string): void => pushParams({ sort: value });
  const updateView = (nextView: GridView): void => {
    setView(nextView);
    window.localStorage.setItem('cruisin_grid_view', String(nextView));
  };

  const applyAdvanced = (): void => {
    pushParams({
      category: draft.category || null,
      collection: draft.collection || null,
      gender: draft.gender || null,
      size: draft.size || null,
      color: draft.color || null,
      priceMin: draft.priceMin || null,
      priceMax: draft.priceMax || null,
      availability: draft.availability === 'all' ? null : draft.availability,
      sale: draft.sale ? 'true' : null,
      sort: draft.sort || null
    });
    setAdvancedOpen(false);
  };

  const clearAdvanced = (): void => {
    setDraft(emptyValues);
    pushParams({ category: null, collection: null, gender: null, size: null, color: null, priceMin: null, priceMax: null, availability: null, sale: null, sort: null, tags: null });
    setAdvancedOpen(false);
  };

  return (
    <main className="px-6 pb-24 pt-10 lg:px-20 lg:pt-14">
      <section className="relative overflow-hidden border-b border-border-subtle pb-10">
        {heroVideo || heroImage ? <div className="absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden opacity-20">
          {heroVideo ? <>
            <video src={heroVideo} poster={videoPoster} className="hidden h-full w-full object-cover sm:block" autoPlay={categoryData?.videoAutoplay ?? true} muted={categoryData?.videoMuted ?? true} loop={categoryData?.videoLoop ?? true} playsInline />
            <video src={mobileHeroVideo || heroVideo} poster={videoPoster} className="h-full w-full object-cover sm:hidden" autoPlay={categoryData?.videoAutoplay ?? true} muted={categoryData?.videoMuted ?? true} loop={categoryData?.videoLoop ?? true} playsInline />
          </> : <>
            {heroImage ? <Image src={heroImage} alt={categoryData?.imageAltText || selectedCollection?.imageAltText || ''} fill sizes="100vw" className={(mobileHeroImage && mobileHeroImage !== heroImage ? 'hidden sm:block ' : '') + 'object-cover'} /> : null}
            {mobileHeroImage && mobileHeroImage !== heroImage ? <Image src={mobileHeroImage} alt={categoryData?.imageAltText || selectedCollection?.imageAltText || ''} fill sizes="100vw" className="object-cover sm:hidden" /> : null}
          </>}
          <div className="absolute inset-0 bg-gradient-to-b from-background-primary/20 to-background-primary" />
        </div> : null}
        {showCollectionCarousel && (siteSettings.data?.isCollectionCarouselEnabled ?? true) ? <div className="mb-10"><CollectionCarousel collections={collections.data ?? []} activeSlug={collectionSlug} /></div> : null}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-accent text-xs uppercase tracking-[0.2em] text-accent-gold">{eyebrow}</p>
            <h1 className="mt-3 font-display text-5xl font-light text-text-primary md:text-hero">{pageTitle}</h1>
            {pageSubtitle ? <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">{pageSubtitle}</p> : null}
            <p className="mt-4 text-sm text-text-secondary">{COPY.shop.showing} {items.length} of {total} {COPY.shop.items}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {flashlightVisible ? <FlashlightToggle active={spotlight} onToggle={() => setSpotlight((current) => !current)} /> : null}
            <GridViewToggle value={view} onChange={updateView} />
            <SortSelect value={sort} onChange={updateSort} />
            {advancedVisible ? <Button variant="secondary" onClick={() => setAdvancedOpen(true)}><SlidersHorizontal size={16} /> Advanced Filters</Button> : null}
          </div>
        </div>
        {filtersVisible ? <div className="mt-8"><FilterChips chips={chips} activeValue={activeCategory ?? activeTags} onSelect={selectChip} /></div> : null}
        {bannerVisible && (bannerImage || bannerVideo || bannerTitle || bannerSubtitle) ? <div className="mt-10 overflow-hidden border border-border-subtle bg-background-elevated">
          {(bannerVideo || bannerImage) ? <div className="relative aspect-[16/6] min-h-48 overflow-hidden">
            {bannerVideo ? <>
              <video src={bannerVideo} poster={videoPoster} className="hidden h-full w-full object-cover sm:block" autoPlay muted loop playsInline />
              <video src={mobileBannerVideo || bannerVideo} poster={videoPoster} className="h-full w-full object-cover sm:hidden" autoPlay muted loop playsInline />
            </> : <>
              {bannerImage ? <Image src={bannerImage} alt="" fill sizes="100vw" className={(mobileBannerImage && mobileBannerImage !== bannerImage ? 'hidden sm:block ' : '') + 'object-cover'} /> : null}
              {mobileBannerImage && mobileBannerImage !== bannerImage ? <Image src={mobileBannerImage} alt="" fill sizes="100vw" className="object-cover sm:hidden" /> : null}
            </>}
            <div className="absolute inset-0 bg-gradient-to-t from-background-primary/85 to-transparent" />
          </div> : null}
          <div className="p-5 md:p-7">
            {bannerTitle ? <h2 className="font-display text-3xl font-light text-text-primary">{bannerTitle}</h2> : null}
            {bannerSubtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{bannerSubtitle}</p> : null}
            {settings?.ctaText && settings.ctaLink ? <a href={settings.ctaLink} className="mt-5 inline-flex min-h-11 items-center border border-border px-4 font-accent text-[11px] uppercase tracking-[0.16em] text-accent-gold transition hover:border-accent-gold hover:text-text-primary">{settings.ctaText}</a> : null}
          </div>
        </div> : null}
      </section>

      <section className={cn('pt-10 transition duration-300', spotlight && 'bg-[radial-gradient(circle_at_50%_0%,rgba(200,169,126,0.12),transparent_28rem)]')}>
        {products.isLoading ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-px xl:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div> : items.length > 0 ? <ProductGrid products={items} view={view} spotlight={spotlight} /> : <EmptyState title={COPY.shop.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.shop.emptyCta} href={pathname} />}
        <div className="mt-16 flex justify-center">
          <Button variant="secondary" disabled={items.length >= total} onClick={() => setLimit((current) => current + 24)}>{COPY.shop.loadMore}</Button>
        </div>
      </section>

      <AdvancedFiltersDrawer open={advancedOpen} onOpenChange={setAdvancedOpen} values={draft} onChange={setDraft} onApply={applyAdvanced} onClear={clearAdvanced} categories={categories.data ?? []} collections={collections.data ?? []} />
    </main>
  );
}
