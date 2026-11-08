// Governed by .rules v1.0
'use client';

import {editorialLinkSchema} from '@cruisin/contracts/editorial';
import { SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {flushSync} from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AdvancedFiltersDrawer, type AdvancedFilterValues } from '@/components/shop/advanced-filters-drawer';
import { CollectionCarousel } from '@/components/collections/collection-carousel';
import { EmptyState } from '@/components/shared/empty-state';
import { type FilterChip } from '@/components/shop/filter-chips';
import { type GridView } from '@/components/shop/product-grid';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EditorialProductCard } from '@/components/shop/editorial-product-card';
import { STOREFRONT_COPY as C } from '@/constants/storefront-copy';
import { SortSelect } from '@/components/shop/sort-select';
import { COPY } from '@/constants/copy';
import { useCategoryByPath, useCategories } from '@/hooks/useCategories';
import { useCollections, usePageSettings, useSiteSettings, useTags } from '@/hooks/useMerchandising';
import { useProducts, type UseProductsInput } from '@/hooks/useProducts';
import { compareSizes } from '@/lib/variant-utils';
import type { CategoryDto, CollectionDto, PageSettingsDto } from '@/types/dto.types';

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
  initialCategory?: CategoryDto | null;
  initialSettings?: PageSettingsDto | null;
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

export function ProductListingPage({ pageType, pageSlug, eyebrow = COPY.shop.eyebrow, title, subtitle, gender, sale, featured, bestseller, latestDrop, categoryPath, collectionSlug, selectedCollection = null, initialCategory = null, initialSettings = null, showCollectionCarousel = false }: ProductListingPageProps): ReactNode {
  const router = useRouter();
  const reducedMotion=useStorefrontReducedMotion();
  const filterTrigger=useRef<HTMLButtonElement>(null);
  const [dense,setDense]=useState(false);
  useEffect(()=>{setDense(localStorage.getItem('cruisin_collection_density')==='dense');},[]);
  const toggleDensity=():void=>{const update=():void=>{flushSync(()=>setDense(current=>{const next=!current;localStorage.setItem('cruisin_collection_density',next?'dense':'regular');return next;}));};if(!reducedMotion&&document.startViewTransition)document.startViewTransition(update);else update();};
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
  const [view, setView] = useState<GridView>(4);
  const settings = pageSettings.data ?? initialSettings;
  const categoryData = initialCategory ?? category.data;
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
  const activeQuery = params.get('q')?.trim() || undefined;
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
    q: activeQuery,
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

  const facetProducts = useProducts({
    q: activeQuery,
    category: activeCategory,
    collection: activeCollection,
    tags: activeTags,
    gender: activeGender,
    sale: activeSale ? true : undefined,
    featured: featured ? true : undefined,
    bestseller: bestseller ? true : undefined,
    latestDrop: latestDrop ? true : undefined,
    priceMin: params.get('priceMin') ? Number(params.get('priceMin')) : undefined,
    priceMax: params.get('priceMax') ? Number(params.get('priceMax')) : undefined,
    availability: 'all',
    sort: 'newest',
    limit: 100
  });

  const [countDraft,setCountDraft]=useState(draft);
  useEffect(()=>{const timer=window.setTimeout(()=>setCountDraft(draft),250);return()=>window.clearTimeout(timer);},[draft]);
  const filterPreview=useProducts({enabled:advancedOpen,q:activeQuery,category:categoryPath||countDraft.category||undefined,collection:collectionSlug||countDraft.collection||undefined,tags:activeTags,gender:(countDraft.gender||gender||undefined) as UseProductsInput['gender'],sale:sale||countDraft.sale||undefined,featured:featured||undefined,bestseller:bestseller||undefined,latestDrop:latestDrop||undefined,size:countDraft.size||undefined,color:countDraft.color||undefined,priceMin:countDraft.priceMin&&Number.isFinite(Number(countDraft.priceMin))?Number(countDraft.priceMin):undefined,priceMax:countDraft.priceMax&&Number.isFinite(Number(countDraft.priceMax))?Number(countDraft.priceMax):undefined,availability:countDraft.availability as UseProductsInput['availability'],sort:countDraft.sort,limit:1});
  const items = products.data?.items ?? [];
  const total = products.data?.total ?? items.length;
  const facetVariants = (facetProducts.data?.items ?? []).flatMap((product) => product.variants.filter((variant) => variant.enabled !== false));
  const sizeFacets = Array.from(new Map(facetVariants.filter((variant) => variant.size.trim()).map((variant) => [variant.size.trim().toLowerCase(), variant.size.trim()])).values()).sort(compareSizes);
  const colorFacets = Array.from(new Map(facetVariants.filter((variant) => variant.color.trim()).map((variant) => [variant.color.trim().toLowerCase(), { label: variant.color.trim(), hex: variant.colorHex }])).values()).sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
  const appliedVariantFilters = [
    activeQuery ? { key: 'q', label: `Search: ${activeQuery}` } : null,
    params.get('color') ? { key: 'color', label: `Color: ${params.get('color')}` } : null,
    params.get('size') ? { key: 'size', label: `Size: ${params.get('size')}` } : null,
    params.get('availability') ? { key: 'availability', label: `Availability: ${params.get('availability')?.replace('-', ' ')}` } : null,
    params.get('priceMin') ? { key: 'priceMin', label: `From ₹${params.get('priceMin')}` } : null,
    params.get('priceMax') ? { key: 'priceMax', label: `Up to ₹${params.get('priceMax')}` } : null
  ].filter((item): item is { key: string; label: string } => Boolean(item));
  const heroImage = selectedCollection?.heroImage || settings?.heroImage || categoryData?.heroImage || categoryData?.image;
  const mobileHeroImage=selectedCollection?.mobileHeroImage||selectedCollection?.mobileImage||settings?.mobileHeroImage||categoryData?.mobileHeroImage||heroImage;
  const heroVideo=selectedCollection?.collectionVideo||settings?.heroVideo||categoryData?.categoryVideo||categoryData?.backgroundVideo;
  const mobileHeroVideo=selectedCollection?.mobileCollectionVideo||settings?.mobileHeroVideo||categoryData?.mobileCategoryVideo||heroVideo;
  const videoPoster=selectedCollection?.videoPosterImage||settings?.videoPosterImage||categoryData?.videoPosterImage||heroImage;
  const configuredHero=Boolean(selectedCollection?.heroImage||selectedCollection?.collectionVideo||settings?.heroImage||settings?.heroVideo||categoryData?.heroImage||categoryData?.categoryVideo||categoryData?.backgroundVideo);
  const bannerVisible=selectedCollection?.isBannerVisible??settings?.isBannerVisible??Boolean(categoryData?.bannerImage||categoryData?.bannerTitle);
  const bannerImage=selectedCollection?.bannerImage||settings?.bannerImage||categoryData?.bannerImage;
  const mobileBannerImage=selectedCollection?.mobileBannerImage||settings?.mobileBannerImage||categoryData?.mobileBannerImage||bannerImage;
  const bannerVideo=settings?.bannerVideo;const mobileBannerVideo=settings?.mobileBannerVideo||bannerVideo;
  const bannerLink=editorialLinkSchema.safeParse(settings?.ctaLink);
  const bannerTitle=categoryData?.bannerTitle||settings?.ctaText;
  const bannerSubtitle=categoryData?.bannerSubtitle||settings?.subtitle;
  const pageTitle = selectedCollection?.heroTitle || selectedCollection?.title || categoryData?.heroTitle || categoryData?.name || settings?.title || title || titleFromSlug(pageSlug);
  const rawPageSubtitle = selectedCollection?.heroSubtitle || selectedCollection?.description || categoryData?.heroSubtitle || categoryData?.description || settings?.subtitle || subtitle || '';
  const heroMediaVisible = siteSettings.isSuccess && (siteSettings.data?.isListingHeroMediaEnabled ?? true);
  const filtersVisible = browsingSettings.areFiltersVisible;
  const advancedVisible = browsingSettings.isAdvancedFilterEnabled && (siteSettings.data?.isAdvancedFilterEnabled ?? true);
  const chips = useMemo<FilterChip[]>(() => {
    const sourceTags: FilterChip[] = (tags.data ?? []).filter((tag) => tag.isVisible).map((tag) => ({ label: tag.name, value: tag.slug, kind: tag.slug === 'view-all' ? 'clear' : 'tag' }));
    if ((categories.data?.length??0) === 0 && sourceTags.length > 0) return sourceTags;
    return [{ label: 'View All', value: 'view-all', kind: 'clear' }, ...(categories.data ?? []).filter((item) => item.showInFilters !== false).map((item) => ({ label: item.name, value: item.path ?? item.slug, kind: 'category' as const }))];
  }, [categories.data, tags.data]);

  const pushParams = (updates: Record<string, string | null>): void => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key); else next.set(key, value);
    });
    const query = next.toString();
    router.push(query ? pathname + '?' + query : pathname,{scroll:false});
  };

  const selectChip = (chip: FilterChip): void => {
    if (chip.kind === 'clear') {
      pushParams({ category: null, tags: null });
      return;
    }
    pushParams(chip.kind === 'category' ? { category: chip.value, tags: null } : { tags: chip.value, category: null });
  };

  const updateSort = (value: string): void => pushParams({ sort: value });
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
    pushParams({ q: null, category: null, collection: null, gender: null, size: null, color: null, priceMin: null, priceMax: null, availability: null, sale: null, sort: null, tags: null });
    setAdvancedOpen(false);
  };

  return <main className="collection-page">
    <h1 className="sr-only">{pageTitle}</h1>
    {showCollectionCarousel && (siteSettings.data?.isCollectionCarouselEnabled ?? true) && (collections.data?.length ?? 0)>0 && <div className="collection-carousel"><CollectionCarousel collections={collections.data??[]} activeSlug={collectionSlug}/></div>}
    {configuredHero && heroMediaVisible && <div data-testid="listing-hero-media" className="collection-campaign">{heroVideo?<video poster={videoPoster} autoPlay={!reducedMotion&&(categoryData?.videoAutoplay??true)} muted loop={categoryData?.videoLoop??true} playsInline controls={reducedMotion} preload="metadata"><source media="(max-width:639px)" src={mobileHeroVideo}/><source src={heroVideo}/></video>:<>{heroImage&&<Image src={heroImage} alt={pageTitle} fill sizes="100vw" className="hidden object-cover sm:block"/>}{mobileHeroImage&&<Image src={mobileHeroImage} alt={pageTitle} fill sizes="100vw" className="object-cover sm:hidden"/>}</>}<div><h2>{pageTitle}</h2><p>{rawPageSubtitle}</p></div></div>}
    {bannerVisible&&(bannerImage||bannerVideo||bannerTitle)&&<section className="collection-banner">{(bannerImage||bannerVideo)&&<div className="collection-banner-media">{bannerVideo?<video autoPlay={!reducedMotion} muted loop playsInline controls={reducedMotion} preload="metadata"><source media="(max-width:639px)" src={mobileBannerVideo}/><source src={bannerVideo}/></video>:<>{bannerImage&&<Image src={bannerImage} alt={bannerTitle??pageTitle} fill sizes="100vw" className="hidden object-cover sm:block"/>}{mobileBannerImage&&<Image src={mobileBannerImage} alt={bannerTitle??pageTitle} fill sizes="100vw" className="object-cover sm:hidden"/>}</>}</div>}<div>{bannerTitle&&<h2>{bannerTitle}</h2>}{bannerSubtitle&&<p>{bannerSubtitle}</p>}{settings?.ctaText&&bannerLink.success&&<a href={bannerLink.data}>{settings.ctaText}</a>}</div></section>}
    {filtersVisible&&<nav className="collection-categories" aria-label="Product categories">{chips.map(chip=><button type="button" key={chip.kind+chip.value} aria-pressed={activeCategory===chip.value||activeTags===chip.value||(chip.kind==='clear'&&!activeCategory&&!activeTags)} onClick={()=>selectChip(chip)}>{chip.label}</button>)}</nav>}
    <div className="collection-toolbar" data-testid="listing-toolbar"><button type="button" ref={filterTrigger} className="collection-filter-trigger" onClick={()=>setAdvancedOpen(true)} disabled={!advancedVisible}><SlidersHorizontal size={18} strokeWidth={1.2}/>{C.filters}</button><button type="button" className="collection-window-toggle" aria-label={dense?C.regularGrid:C.denseGrid} aria-pressed={dense} title={dense?C.regularGrid:C.denseGrid} onClick={toggleDensity}><svg viewBox="0 0 32 40" aria-hidden="true"><path d="M5 37V16a11 11 0 0 1 22 0v21Z"/><path d="M16 5v32M5 20h22M5 29h22"/><path className="collection-window-left" d="M5 20 1 16V5l4 11v21l-4-5V16"/><path className="collection-window-right" d="m27 20 4-4V5l-4 11v21l4-5V16"/></svg></button><SortSelect value={sort} onChange={updateSort}/></div>
    {appliedVariantFilters.length>0&&<div className="collection-applied" aria-label="Applied product filters">{appliedVariantFilters.map(filter=><button type="button" key={filter.key} onClick={()=>pushParams({[filter.key]:null})} aria-label={`Remove ${filter.label}`}>{filter.label} ×</button>)}<button type="button" onClick={clearAdvanced}>{C.clear}</button></div>}
    <section aria-label={pageTitle} aria-busy={products.isFetching}>
      {products.isLoading?<div className="collection-product-grid" aria-label={C.loading}>{[0,1,2,3].map(index=><SkeletonCard key={index}/>)}</div>:products.isError?<div className="collection-empty" role="alert"><h2>{C.loadError}</h2><button type="button" onClick={()=>void products.refetch()}>{C.retry}</button></div>:items.length>0?<div className="collection-product-grid" data-view={view} data-density={dense?'dense':'regular'}>{items.map((product,index)=><EditorialProductCard key={product.id} product={product} priority={index<4}/>)}</div>:<EmptyState title={COPY.shop.emptyTitle} body={COPY.cart.emptyBody} cta={COPY.shop.emptyCta} href={pathname}/>}
      {!products.isError&&<div className="collection-load-more">{items.length<total?<button type="button" onClick={()=>setLimit(current=>current+24)}>{C.loadMore}</button>:items.length>0?<p>{C.allViewed}</p>:null}</div>}
    </section>
    <AdvancedFiltersDrawer triggerRef={filterTrigger} open={advancedOpen} onOpenChange={setAdvancedOpen} values={draft} onChange={setDraft} onApply={applyAdvanced} onClear={clearAdvanced} categories={categories.data??[]} collections={collections.data??[]} sizes={sizeFacets} colors={colorFacets} resultCount={filterPreview.data?.total} countLoading={filterPreview.isFetching}/>
  </main>;
}
