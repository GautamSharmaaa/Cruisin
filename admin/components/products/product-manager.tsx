// Governed by .rules v1.0
'use client';

import { AlertTriangle, Archive, BadgeIndianRupee, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, ExternalLink, FileStack, Info, LayoutGrid, LinkIcon, PackagePlus, Pencil, RefreshCw, Search, Share2, SlidersHorizontal, Sparkles, Star, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { AdminCard, AdminSectionHeader, AdminTabs, EmptyState } from '@/components/dashboard/admin-ui';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { useArchiveProduct, useDuplicateProduct, usePatchProduct } from '@/hooks/useAdminMutations';
import { type AdminProductFilters, useAdminCategories, useAdminProducts } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { calculateProductHealth, downloadProductsCsv, productBaseSku, productCategoryName, productColor, productId, productInsight, productStatus, productTotalStock, stockState, validateStockValue } from '@/lib/product-catalogue';
import { cn } from '@/lib/utils';
import type { ProductDto } from '@/types/dto.types';

type ProductTab = 'all' | 'tools';
type FilterState = Required<Pick<AdminProductFilters, 'status' | 'stock' | 'featured' | 'bestseller' | 'newArrival' | 'needsFix' | 'sort'>> & Pick<AdminProductFilters, 'category' | 'createdFrom' | 'updatedFrom' | 'pickupAddress'>;
type ProductVariant = NonNullable<ProductDto['variants']>[number];
type ToastState = { tone: 'success' | 'error' | 'info'; message: string } | null;
type ModalState = { title: string; body: string; action?: ReactNode } | null;
type QuickDraft = { title: string; basePrice: string; comparePrice: string };
interface ApiEnvelope<TData> { data: TData; }
interface ProductPage { items: ProductDto[]; total: number; page: number; pages: number; }

const defaultFilters: FilterState = { status: 'all', stock: 'all', featured: 'all', bestseller: 'all', newArrival: 'all', needsFix: 'all', sort: 'updated', category: '', createdFrom: '', updatedFrom: '', pickupAddress: '' };

const statusOptions = [['all', 'All Status'], ['visible', 'Visible'], ['hidden', 'Hidden'], ['draft', 'Draft'], ['archived', 'Archived']] as const;
const stockOptions = [['all', 'All Stock'], ['in-stock', 'In Stock'], ['low-stock', 'Low Stock'], ['out-of-stock', 'Out of Stock']] as const;
const flagOptions = [['all', 'All'], ['yes', 'Yes'], ['no', 'No']] as const;
const sortOptions = [['updated', 'Recently Updated'], ['newest', 'Recently Created'], ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low'], ['stock-asc', 'Stock: Low to High'], ['stock-desc', 'Stock: High to Low'], ['sales-desc', 'Lifetime Sales'], ['title-asc', 'Product Name A-Z']] as const;
const tabs: Array<{ value: ProductTab; label: string; helper?: string }> = [{ value: 'all', label: 'All Products', helper: 'Search, edit, bulk update' }, { value: 'tools', label: 'Product Tools', helper: 'Shortcuts and catalogue links' }];

const useDebouncedValue = (value: string, delay: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
};

const todayFilenameDate = (): string => new Date().toISOString().slice(0, 10);

const SelectControl = ({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }): ReactNode => (
  <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-36 border border-border bg-background-input px-3 text-sm normal-case tracking-[0.02em] text-text-primary transition focus:border-accent-gold">
      {children}
    </select>
  </label>
);

const MiniStat = ({ label, value, tone }: { label: string; value: string | number; tone?: 'warning' | 'danger' | 'success' }): ReactNode => (
  <div className="border border-border bg-background-elevated p-4">
    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">{label}</p>
    <p className={cn('mt-2 font-mono text-xl text-text-primary', tone === 'warning' && 'text-warning', tone === 'danger' && 'text-danger', tone === 'success' && 'text-success')}>{value}</p>
  </div>
);

const Badge = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'gold' }): ReactNode => (
  <span className={cn('inline-flex min-h-7 items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]', tone === 'neutral' && 'border-border text-text-secondary', tone === 'success' && 'border-success/70 text-success', tone === 'warning' && 'border-warning/80 text-warning', tone === 'danger' && 'border-danger/80 text-danger', tone === 'gold' && 'border-accent-gold/70 text-accent-gold')}>{children}</span>
);

const IconButton = ({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }): ReactNode => (
  <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center border border-border bg-background-primary text-text-secondary transition hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-50">
    {children}
  </button>
);

const Modal = ({ state, onClose }: { state: ModalState; onClose: () => void }): ReactNode => {
  if (!state) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background-primary/80 p-4 backdrop-blur" role="dialog" aria-modal="true">
    <div className="w-full max-w-lg border border-border-strong bg-background-elevated p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-gold">Product Control</p>
          <h2 className="mt-3 text-xl text-text-primary">{state.title}</h2>
        </div>
        <button type="button" aria-label="Close modal" onClick={onClose} className="text-text-secondary transition hover:text-text-primary"><X size={18} /></button>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-secondary">{state.body}</p>
      {state.action ? <div className="mt-6">{state.action}</div> : null}
      <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
};

const skeletonRows = Array.from({ length: 4 }, (_, index) => index);

export function ProductManager(): ReactNode {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProductTab>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickDrafts, setQuickDrafts] = useState<Record<string, QuickDraft>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, Record<string, string>>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState({ mode: 'increase', value: '' });

  const debouncedSearch = useDebouncedValue(search, 300);
  const categories = useAdminCategories();
  const products = useAdminProducts({ q: debouncedSearch || undefined, ...filters, category: filters.category || undefined, createdFrom: filters.createdFrom || undefined, updatedFrom: filters.updatedFrom || undefined, pickupAddress: filters.pickupAddress || undefined, page, limit: 50 });
  const patchProduct = usePatchProduct();
  const archiveProduct = useArchiveProduct();
  const duplicateProduct = useDuplicateProduct();
  const productItems = products.data?.items ?? [];
  const selectedProducts = productItems.filter((product) => selected.has(productId(product)));

  useEffect(() => setPage(1), [debouncedSearch, filters]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const summaries = useMemo(() => {
    const total = products.data?.total ?? productItems.length;
    const visible = productItems.filter((product) => product.isActive && !product.isArchived).length;
    const low = productItems.filter((product) => stockState(product) === 'low-stock').length;
    const out = productItems.filter((product) => stockState(product) === 'out-of-stock').length;
    const hidden = productItems.filter((product) => !product.isActive || product.isArchived).length;
    const updated = productItems.filter((product) => {
      if (!product.updatedAt) return false;
      return Date.now() - new Date(product.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7;
    }).length;
    return { total, visible, low, out, hidden, updated };
  }, [productItems, products.data?.total]);

  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([key, value]) => value && defaultFilters[key as keyof FilterState] !== value).length + (search ? 1 : 0), [filters, search]);

  const showToast = (nextToast: ToastState): void => setToast(nextToast);
  const updateFilter = <TKey extends keyof FilterState>(key: TKey, value: FilterState[TKey]): void => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = (): void => { setSearch(''); setFilters(defaultFilters); };

  const getQuickDraft = (product: ProductDto): QuickDraft => quickDrafts[productId(product)] ?? { title: product.title, basePrice: String(product.basePrice), comparePrice: product.comparePrice ? String(product.comparePrice) : '' };
  const setQuickDraft = (product: ProductDto, patch: Partial<QuickDraft>): void => setQuickDrafts((current) => ({ ...current, [productId(product)]: { ...getQuickDraft(product), ...patch } }));
  const quickDirty = (product: ProductDto): boolean => {
    const draft = getQuickDraft(product);
    return draft.title !== product.title || Number(draft.basePrice) !== product.basePrice || (draft.comparePrice ? Number(draft.comparePrice) : undefined) !== product.comparePrice;
  };

  const saveQuickDraft = async (product: ProductDto): Promise<void> => {
    const id = productId(product);
    const draft = getQuickDraft(product);
    const basePrice = Number(draft.basePrice);
    const comparePrice = draft.comparePrice ? Number(draft.comparePrice) : undefined;
    if (!draft.title.trim()) { showToast({ tone: 'error', message: 'Product title cannot be empty.' }); return; }
    if (!Number.isFinite(basePrice) || basePrice <= 0) { showToast({ tone: 'error', message: 'Price must be greater than zero.' }); return; }
    if (comparePrice !== undefined && comparePrice > 0 && comparePrice <= basePrice) { showToast({ tone: 'error', message: 'MRP must be greater than the selling price.' }); return; }
    try {
      const variants = product.variants?.map((variant) => ({ ...variant, price: variant.priceOverride ?? basePrice }));
      await patchProduct.mutateAsync({ id, patch: { title: draft.title.trim(), basePrice, comparePrice: comparePrice ?? 0, variants } });
      setQuickDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showToast({ tone: 'success', message: 'Product details saved.' });
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const updateStockDraft = (product: ProductDto, variant: ProductVariant, value: string): void => {
    const id = productId(product);
    setStockDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? {}), [variant.sku]: value } }));
  };

  const resetStockDraft = (product: ProductDto): void => {
    const id = productId(product);
    setStockDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const saveStockDraft = async (product: ProductDto): Promise<void> => {
    const id = productId(product);
    const draft = stockDrafts[id];
    if (!draft) return;
    const variants = (product.variants ?? []).map((variant) => {
      const nextStock = draft[variant.sku] === undefined ? variant.stock : Number(draft[variant.sku]);
      const error = validateStockValue(nextStock);
      if (error) throw new Error(error);
      return { ...variant, stock: nextStock };
    });
    try {
      await patchProduct.mutateAsync({ id, patch: { variants } });
      resetStockDraft(product);
      showToast({ tone: 'success', message: 'Inventory saved.' });
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const handleStockKey = (event: KeyboardEvent<HTMLInputElement>, product: ProductDto): void => {
    if (event.key === 'Enter') void saveStockDraft(product);
    if (event.key === 'Escape') resetStockDraft(product);
  };

  const toggleFlag = async (product: ProductDto, field: 'isActive' | 'isFeatured' | 'isBestseller' | 'isNewArrival'): Promise<void> => {
    const health = calculateProductHealth(product);
    if (field === 'isActive' && !product.isActive && health.state === 'critical') {
      setModal({ title: 'Product needs fixes', body: 'This product is missing critical product data: ' + health.missing.slice(0, 5).join(', ') + '. Fix these before making it visible.' });
      return;
    }
    try {
      await patchProduct.mutateAsync({ id: productId(product), patch: { [field]: !Boolean(product[field]) } as Partial<ProductDto> });
      showToast({ tone: 'success', message: 'Product status updated.' });
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const archiveOne = (product: ProductDto): void => {
    setModal({
      title: 'Archive product',
      body: 'Archive "' + product.title + '"? It will be hidden from active product operations and the storefront.',
      action: <Button variant="danger" disabled={archiveProduct.isPending} onClick={() => {
        archiveProduct.mutate(productId(product), { onSuccess: () => { setModal(null); showToast({ tone: 'success', message: 'Product archived.' }); }, onError: (error) => showToast({ tone: 'error', message: error.message }) });
      }}><Archive size={15} className="mr-2" />Archive</Button>
    });
  };

  const duplicateOne = async (product: ProductDto): Promise<void> => {
    try {
      const created = await duplicateProduct.mutateAsync(productId(product));
      showToast({ tone: 'success', message: 'Draft duplicate created.' });
      router.push('/products/' + productId(created));
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const copyProductLink = async (product: ProductDto): Promise<void> => {
    const path = '/product/' + product.slug;
    await navigator.clipboard.writeText(window.location.origin.replace('3001', '3000') + path);
    showToast({ tone: 'success', message: 'Product link copied.' });
  };

  const shareProduct = async (product: ProductDto): Promise<void> => {
    const url = window.location.origin.replace('3001', '3000') + '/product/' + product.slug;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url });
        return;
      } catch {
        await copyProductLink(product);
        return;
      }
    }
    await copyProductLink(product);
  };

  const loadFilteredProductsForExport = async (): Promise<ProductDto[]> => {
    const params = { q: debouncedSearch || undefined, ...filters, category: filters.category || undefined, createdFrom: filters.createdFrom || undefined, updatedFrom: filters.updatedFrom || undefined, pickupAddress: filters.pickupAddress || undefined, page: 1, limit: 100 };
    const first = await api.get<ApiEnvelope<ProductPage>>('/products/admin/catalogue', { params });
    const pages = first.data.data.pages;
    if (pages <= 1) return first.data.data.items;
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => api.get<ApiEnvelope<ProductPage>>('/products/admin/catalogue', { params: { ...params, page: index + 2 } })));
    return [first.data.data.items, ...rest.map((response) => response.data.data.items)].flat();
  };

  const exportCurrent = async (onlySelected: boolean): Promise<void> => {
    const exportItems = onlySelected ? selectedProducts : await loadFilteredProductsForExport();
    if (exportItems.length === 0) { showToast({ tone: 'error', message: 'No products available to export.' }); return; }
    downloadProductsCsv(exportItems);
    showToast({ tone: 'success', message: 'CSV exported for ' + todayFilenameDate() + '.' });
  };

  const toggleSelected = (id: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allPageSelected = productItems.length > 0 && productItems.every((product) => selected.has(productId(product)));
  const toggleAllPage = (): void => setSelected((current) => {
    const next = new Set(current);
    if (allPageSelected) productItems.forEach((product) => next.delete(productId(product))); else productItems.forEach((product) => next.add(productId(product)));
    return next;
  });

  const bulkPatch = async (patch: Partial<ProductDto>, message: string): Promise<void> => {
    const targets = selectedProducts;
    if (targets.length === 0) return;
    try {
      await Promise.all(targets.map((product) => patchProduct.mutateAsync({ id: productId(product), patch })));
      showToast({ tone: 'success', message });
      setSelected(new Set());
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const bulkArchive = (): void => setModal({
    title: 'Archive selected products',
    body: 'Archive ' + selected.size + ' selected products? This is safer than deleting and can be restored later.',
    action: <Button variant="danger" disabled={archiveProduct.isPending} onClick={async () => {
      try {
        await Promise.all(selectedProducts.map((product) => archiveProduct.mutateAsync(productId(product))));
        setSelected(new Set());
        setModal(null);
        showToast({ tone: 'success', message: 'Selected products archived.' });
      } catch (error) {
        showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
      }
    }}><Archive size={15} className="mr-2" />Archive Selected</Button>
  });

  const applyBulkPrice = async (): Promise<void> => {
    const value = Number(bulkPrice.value);
    if (!Number.isFinite(value) || value < 0) { showToast({ tone: 'error', message: 'Enter a valid price adjustment.' }); return; }
    try {
      await Promise.all(selectedProducts.map((product) => {
        const basePrice = bulkPrice.mode === 'set' ? value : bulkPrice.mode === 'decrease' ? Math.max(1, Math.round(product.basePrice * (1 - value / 100))) : Math.round(product.basePrice * (1 + value / 100));
        const variants = product.variants?.map((variant) => ({ ...variant, price: variant.priceOverride ?? basePrice }));
        return patchProduct.mutateAsync({ id: productId(product), patch: { basePrice, variants } });
      }));
      setModal(null);
      setBulkPriceOpen(false);
      setSelected(new Set());
      setBulkPrice({ mode: 'increase', value: '' });
      showToast({ tone: 'success', message: 'Bulk price update complete.' });
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : COPY.common.error });
    }
  };

  const openBulkPriceModal = (): void => setBulkPriceOpen(true);
  const openArchivedProducts = (): void => {
    setSearch('');
    setFilters({ ...defaultFilters, status: 'archived' });
    setSelected(new Set());
    setPage(1);
    setActiveTab('all');
  };

  const renderToolsContent = (): ReactNode => <AdminCard className="grid gap-5">
    <AdminSectionHeader eyebrow="Product Operations" title="Tools and catalogue workflows" description="Product editing stays focused here. Supplier import/export and grouped catalogue workflows now live in Catalogues, with quick shortcuts from this panel." />
    <div className="grid gap-3 md:grid-cols-3">
      <Link href="/products/new" className="border border-border bg-background-primary p-4 transition hover:border-accent-gold"><PackagePlus className="text-accent-gold" size={20} /><p className="mt-3 text-text-primary">Create product</p><p className="mt-1 text-sm text-text-secondary">Manual product entry with media, pricing, variants, and categorization.</p></Link>
      <Link href="/catalogues" className="border border-border bg-background-primary p-4 transition hover:border-accent-gold"><FileStack className="text-accent-gold" size={20} /><p className="mt-3 text-text-primary">Import catalogue</p><p className="mt-1 text-sm text-text-secondary">Upload CSV, preview, dry-run, confirm, and export from the Catalogues section.</p></Link>
      <button type="button" onClick={() => void exportCurrent(false)} className="border border-border bg-background-primary p-4 text-left transition hover:border-accent-gold"><Download className="text-accent-gold" size={20} /><p className="mt-3 text-text-primary">Export current products</p><p className="mt-1 text-sm text-text-secondary">Download a CSV for the current filter set.</p></button>
      <button type="button" onClick={openArchivedProducts} className="border border-border bg-background-primary p-4 text-left transition hover:border-accent-gold md:col-span-3 xl:col-span-1"><Archive className="text-accent-gold" size={20} /><p className="mt-3 text-text-primary">Archived Products</p><p className="mt-1 text-sm text-text-secondary">Review archived products, search by SKU or product code, restore items, or confirm archive-only cleanup.</p></button>
    </div>
  </AdminCard>;

  return <section className="grid gap-6">
    {toast ? <div className={cn('fixed right-5 top-5 z-50 border bg-background-elevated px-4 py-3 text-sm shadow-lg', toast.tone === 'success' && 'border-success text-success', toast.tone === 'error' && 'border-danger text-danger', toast.tone === 'info' && 'border-accent-gold text-accent-gold')}>{toast.message}</div> : null}
    <Modal state={modal} onClose={() => setModal(null)} />
    {bulkPriceOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-background-primary/80 p-4 backdrop-blur" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl border border-border-strong bg-background-elevated p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-gold">Bulk Action</p>
            <h2 className="mt-3 text-xl text-text-primary">Bulk update price</h2>
          </div>
          <button type="button" aria-label="Close bulk price modal" onClick={() => setBulkPriceOpen(false)} className="text-text-secondary transition hover:text-text-primary"><X size={18} /></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-text-secondary">Apply a careful price operation to the selected products. Sale-price specific bulk rules can be connected to a promotion workflow later.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={bulkPrice.mode} onChange={(event) => setBulkPrice((current) => ({ ...current, mode: event.target.value }))} className="h-11 border border-border bg-background-input px-3 text-sm text-text-primary">
            <option value="increase">Increase by %</option>
            <option value="decrease">Decrease by %</option>
            <option value="set">Set fixed price</option>
          </select>
          <input value={bulkPrice.value} onChange={(event) => setBulkPrice((current) => ({ ...current, value: event.target.value }))} className="h-11 border border-border bg-background-input px-3 text-sm text-text-primary" placeholder="Value" inputMode="decimal" />
          <Button onClick={() => void applyBulkPrice()}>Apply</Button>
        </div>
      </div>
    </div> : null}

    <AdminTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

    {activeTab === 'tools' ? renderToolsContent() : <>
      <div className="border border-border bg-background-elevated p-4">
        <div className="flex items-start gap-3 text-sm leading-6 text-text-secondary">
          <Info size={18} className="mt-0.5 shrink-0 text-accent-gold" />
          <p>Keep inventory updated, mark out-of-stock products, and maintain correct product dimensions to avoid order and shipping issues.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Total Results" value={summaries.total} />
        <MiniStat label="Visible This Page" value={summaries.visible} tone="success" />
        <MiniStat label="Low Stock This Page" value={summaries.low} tone="warning" />
        <MiniStat label="Out Of Stock This Page" value={summaries.out} tone="danger" />
        <MiniStat label="Hidden This Page" value={summaries.hidden} />
        <MiniStat label="Updated This Page" value={summaries.updated} />
      </div>

      <div className="grid gap-4 border border-border bg-background-elevated p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
            <span>Search product name, SKU, or slug</span>
            <span className="flex h-12 items-center border border-border bg-background-input px-3 focus-within:border-accent-gold">
              <Search size={17} className="mr-2 text-text-muted" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, SKU, product code, or slug" className="h-full min-w-0 flex-1 bg-transparent text-sm normal-case tracking-[0.02em] text-text-primary outline-none placeholder:text-text-muted" />
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void products.refetch()}><RefreshCw size={15} className="mr-2" />Refresh</Button>
            <Button variant="secondary" onClick={resetFilters}><X size={15} className="mr-2" />Reset {activeFilterCount ? '(' + activeFilterCount + ')' : ''}</Button>
            <Button onClick={() => void exportCurrent(false)}><Download size={15} className="mr-2" />Export CSV</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectControl label="Category" value={filters.category ?? ''} onChange={(value) => updateFilter('category', value)}>
            <option value="">All Categories</option>
            {(categories.data ?? []).map((category) => <option key={category.id ?? category._id ?? category.slug} value={category.slug}>{category.name}</option>)}
          </SelectControl>
          <SelectControl label="Status" value={filters.status} onChange={(value) => updateFilter('status', value as FilterState['status'])}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <SelectControl label="Stock" value={filters.stock} onChange={(value) => updateFilter('stock', value as FilterState['stock'])}>{stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <SelectControl label="Featured" value={filters.featured} onChange={(value) => updateFilter('featured', value as FilterState['featured'])}>{flagOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <SelectControl label="Bestseller" value={filters.bestseller} onChange={(value) => updateFilter('bestseller', value as FilterState['bestseller'])}>{flagOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <SelectControl label="New Arrival" value={filters.newArrival} onChange={(value) => updateFilter('newArrival', value as FilterState['newArrival'])}>{flagOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <SelectControl label="Health" value={filters.needsFix} onChange={(value) => updateFilter('needsFix', value as FilterState['needsFix'])}>
            <option value="all">All Health</option>
            <option value="yes">Needs Fix</option>
          </SelectControl>
          <SelectControl label="Sort By" value={filters.sort} onChange={(value) => updateFilter('sort', value as FilterState['sort'])}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectControl>
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>Created After</span><input type="date" value={filters.createdFrom ?? ''} onChange={(event) => updateFilter('createdFrom', event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm normal-case text-text-primary" /></label>
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>Updated After</span><input type="date" value={filters.updatedFrom ?? ''} onChange={(event) => updateFilter('updatedFrom', event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm normal-case text-text-primary" /></label>
          <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>Pickup / Warehouse</span><input value={filters.pickupAddress ?? ''} onChange={(event) => updateFilter('pickupAddress', event.target.value)} placeholder="Warehouse" className="h-11 border border-border bg-background-input px-3 text-sm normal-case text-text-primary placeholder:text-text-muted" /></label>
        </div>
      </div>

      <div className="border border-border bg-background-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <label className="flex items-center gap-3 text-sm text-text-secondary">
            <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} className="h-4 w-4 accent-[var(--accent-gold)]" />
            Products <span className="border border-border px-2 py-0.5 font-mono text-text-primary">{products.data?.total ?? 0}</span>
          </label>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <SlidersHorizontal size={16} />
            Page {products.data?.page ?? page} of {Math.max(products.data?.pages ?? 1, 1)}
          </div>
        </div>

        {products.isLoading ? <div className="grid gap-0">{skeletonRows.map((row) => <div key={row} className="grid gap-4 border-b border-border p-4 lg:grid-cols-[1.2fr_1fr_320px]"><div className="h-32 animate-pulse bg-background-overlay" /><div className="h-32 animate-pulse bg-background-overlay" /><div className="h-32 animate-pulse bg-background-overlay" /></div>)}</div> : null}
        {!products.isLoading && productItems.length === 0 ? <div className="p-6"><EmptyState title="No products found" message={activeFilterCount ? 'No products found for these filters. Clear filters or create a new product.' : COPY.products.empty} /></div> : null}
        {!products.isLoading ? <div className="grid">
          {productItems.map((product) => {
            const id = productId(product);
            const health = calculateProductHealth(product);
            const stock = productTotalStock(product);
            const state = stockState(product);
            const status = productStatus(product);
            const stockDraft = stockDrafts[id] ?? {};
            const isStockDirty = Object.keys(stockDraft).length > 0;
            const draft = getQuickDraft(product);
            return <article key={id} className="grid gap-5 border-b border-border p-4 transition hover:bg-background-overlay/45 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)_minmax(300px,320px)]">
              <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_132px_minmax(0,1fr)]">
                <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelected(id)} aria-label={'Select ' + product.title} className="mt-3 h-4 w-4 accent-[var(--accent-gold)]" />
                <div className="aspect-[4/5] overflow-hidden border border-border bg-background-primary">
                  {product.images?.[0]?.url ? <img src={product.images[0].url} alt={product.images[0].alt || product.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-text-muted"><LayoutGrid size={28} /></div>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={status === 'visible' ? 'success' : status === 'archived' ? 'danger' : 'neutral'}>{status}</Badge>
                    {state === 'low-stock' ? <Badge tone="warning">Low Stock</Badge> : null}
                    {state === 'out-of-stock' ? <Badge tone="danger">Out Of Stock</Badge> : null}
                    {product.isFeatured ? <Badge tone="gold">Featured</Badge> : null}
                    {product.isBestseller ? <Badge tone="gold">Bestseller</Badge> : null}
                    {product.isNewArrival ? <Badge tone="gold">New Arrival</Badge> : null}
                    {health.state !== 'good' ? <Badge tone={health.state === 'critical' ? 'danger' : 'warning'}>Needs Fix {health.score}</Badge> : <Badge tone="success">Health {health.score}</Badge>}
                  </div>
                  <input value={draft.title} onChange={(event) => setQuickDraft(product, { title: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') void saveQuickDraft(product); if (event.key === 'Escape') setQuickDrafts((current) => ({ ...current, [id]: { title: product.title, basePrice: String(product.basePrice), comparePrice: product.comparePrice ? String(product.comparePrice) : '' } })); }} className="mt-3 w-full border-b border-transparent bg-transparent text-base font-semibold text-text-primary outline-none transition focus:border-accent-gold" />
                  <div className="mt-3 grid gap-1 text-sm text-text-secondary">
                    <p className="truncate">Slug: <span className="font-mono text-text-primary">{product.slug}</span></p>
                    <p className="truncate">Product Code: <span className="font-mono text-text-primary">{productBaseSku(product)}</span></p>
                    <p>Color: {productColor(product)} · Category: {productCategoryName(product)}</p>
                    <p>Created: {product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN') : 'Unknown'} · Updated: {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-IN') : 'Unknown'}</p>
                    <p>Lifetime Sales: <span className="text-accent-gold">{product.lifetimeSales ?? 0}</span> · Rating: {product.ratings?.avg ? product.ratings.avg.toFixed(1) : '--'} · Variants: {(product.variants ?? []).length} · Total Stock: {stock}</p>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-[11px] uppercase tracking-[0.12em] text-text-muted">Selling Price<input value={draft.basePrice} onChange={(event) => setQuickDraft(product, { basePrice: event.target.value })} inputMode="numeric" className="h-10 border border-border bg-background-input px-3 font-mono text-sm normal-case text-accent-gold" /></label>
                    <label className="grid gap-1 text-[11px] uppercase tracking-[0.12em] text-text-muted">MRP<input value={draft.comparePrice} onChange={(event) => setQuickDraft(product, { comparePrice: event.target.value })} inputMode="numeric" placeholder="None" className="h-10 border border-border bg-background-input px-3 font-mono text-sm normal-case text-text-primary placeholder:text-text-muted" /></label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickDirty(product) ? <><Button onClick={() => void saveQuickDraft(product)} disabled={patchProduct.isPending}><Check size={15} className="mr-2" />Save</Button><Button variant="secondary" onClick={() => setQuickDrafts((current) => { const next = { ...current }; delete next[id]; return next; })}>Cancel</Button></> : null}
                    <IconButton label="Copy product link" onClick={() => void copyProductLink(product)}><LinkIcon size={16} /></IconButton>
                    <IconButton label="Open storefront product page" onClick={() => window.open(window.location.origin.replace('3001', '3000') + '/product/' + product.slug, '_blank', 'noopener,noreferrer')}><ExternalLink size={16} /></IconButton>
                    <IconButton label="Preview mobile" onClick={() => setModal({ title: 'Mobile preview', body: 'A dedicated admin mobile preview route is not available yet. Open the storefront product page and use responsive preview for now.' })}><Eye size={16} /></IconButton>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 content-start gap-4 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">SKU Inventory</p>
                    <p className="mt-1 text-xs text-text-muted">{productInsight(product)}</p>
                  </div>
                  {isStockDirty ? <div className="flex gap-2"><Button onClick={() => void saveStockDraft(product)} disabled={patchProduct.isPending}>Save Changes</Button><Button variant="secondary" onClick={() => resetStockDraft(product)}>Cancel</Button></div> : null}
                </div>
                {(product.variants ?? []).length === 0 ? <div className="border border-warning/70 p-4 text-sm text-warning">No variants or SKUs found.</div> : <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {(product.variants ?? []).map((variant) => {
                    const value = stockDraft[variant.sku] ?? String(variant.stock);
                    const numericValue = Number(value);
                    const isLow = numericValue > 0 && numericValue <= (variant.lowStockThreshold ?? product.lowStockThreshold ?? 10);
                    const isOut = numericValue === 0;
                    return <label key={variant._id ?? variant.sku} className="grid min-w-0 gap-1 text-[11px] uppercase tracking-[0.14em] text-text-muted">
                      <span className="flex min-w-0 items-center justify-between gap-2"><span className="shrink-0">{variant.size}</span><span className="min-w-0 flex-1 truncate text-right font-mono normal-case tracking-[0.02em]" title={variant.sku}>{variant.sku}</span></span>
                      <span className={cn('flex h-11 min-w-0 border bg-background-input transition focus-within:border-accent-gold', isLow && 'border-warning', isOut && 'border-danger', !isLow && !isOut && 'border-border', variant.enabled === false && 'opacity-50')}>
                        <input value={value} disabled={variant.enabled === false} onChange={(event: ChangeEvent<HTMLInputElement>) => updateStockDraft(product, variant, event.target.value)} onKeyDown={(event) => handleStockKey(event, product)} inputMode="numeric" className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm normal-case text-text-primary outline-none disabled:cursor-not-allowed" />
                        <button type="button" aria-label={'View ' + variant.sku} className="grid w-11 shrink-0 place-items-center border-l border-border text-accent-gold"><Eye size={15} /></button>
                      </span>
                    </label>;
                  })}
                </div>}
              </div>

              <div className="grid min-w-0 content-start gap-3">
                <Link href={'/products/' + id} className="inline-flex h-11 items-center justify-center bg-accent-gold px-4 text-xs font-medium uppercase tracking-[0.08em] text-text-inverse transition hover:brightness-110 active:scale-[0.98]"><Pencil size={15} className="mr-2" />Edit Product</Link>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setQuickDraft(product, {})}><BadgeIndianRupee size={15} className="mr-2" />Edit Price</Button>
                  <Button variant="secondary" onClick={() => setModal({ title: 'Manage variants', body: 'Variants can be edited inline here for stock. Full SKU creation and image association stay in the product edit form until a dedicated variant manager is added.' })}><PackagePlus size={15} className="mr-2" />Variants</Button>
                  <Button variant="secondary" onClick={() => window.open(window.location.origin.replace('3001', '3000') + '/product/' + product.slug, '_blank', 'noopener,noreferrer')}><Eye size={15} className="mr-2" />Preview</Button>
                  <Button variant="secondary" onClick={() => void copyProductLink(product)}><Copy size={15} className="mr-2" />Copy</Button>
                  <Button variant="secondary" onClick={() => void shareProduct(product)}><Share2 size={15} className="mr-2" />Share</Button>
                  <Button variant="secondary" onClick={() => void duplicateOne(product)} disabled={duplicateProduct.isPending}><FileStack size={15} className="mr-2" />Duplicate</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={product.isActive ? 'secondary' : 'primary'} onClick={() => void toggleFlag(product, 'isActive')}>{product.isActive ? 'Hide' : 'Make Visible'}</Button>
                  <Button variant="secondary" onClick={() => void toggleFlag(product, 'isFeatured')}><Star size={15} className="mr-2" />{product.isFeatured ? 'Unfeature' : 'Feature'}</Button>
                  <Button variant="secondary" onClick={() => void toggleFlag(product, 'isBestseller')}><Sparkles size={15} className="mr-2" />Bestseller</Button>
                  <Button variant="secondary" onClick={() => void toggleFlag(product, 'isNewArrival')}>New Arrival</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {product.isArchived ? <Button variant="secondary" onClick={() => void patchProduct.mutateAsync({ id, patch: { isArchived: false, isActive: false } }).then(() => showToast({ tone: 'success', message: 'Product restored as hidden.' }))}>Restore</Button> : <Button variant="danger" onClick={() => archiveOne(product)}><Archive size={15} className="mr-2" />Archive</Button>}
                  <Button variant="danger" onClick={() => setModal({ title: 'Delete unavailable', body: 'This project archives products instead of hard deleting them. Archive is the safer destructive action for preserving orders and analytics.' })}><Trash2 size={15} className="mr-2" />Delete</Button>
                </div>
                {health.missing.length ? <details className="border border-border p-3 text-sm text-text-secondary"><summary className="cursor-pointer text-warning"><AlertTriangle size={15} className="mr-2 inline" />Health issues</summary><ul className="mt-2 grid gap-1">{health.missing.map((item) => <li key={item}>- {item}</li>)}</ul></details> : null}
              </div>
            </article>;
          })}
        </div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-text-secondary">Showing {productItems.length} of {products.data?.total ?? 0}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} className="mr-2" />Previous</Button>
            <Button variant="secondary" disabled={page >= (products.data?.pages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={15} className="ml-2" /></Button>
          </div>
        </div>
      </div>

      {products.error ? <div className="border border-danger bg-background-elevated p-4 text-sm text-danger">{COPY.common.error} <button type="button" className="ml-2 underline" onClick={() => void products.refetch()}>{COPY.common.retry}</button></div> : null}

      {selected.size > 0 ? <div className="sticky bottom-4 z-30 border border-accent-gold bg-background-primary/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm uppercase tracking-[0.14em] text-accent-gold">{selected.size} selected</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void exportCurrent(true)}><Download size={15} className="mr-2" />Export Selected</Button>
            <Button variant="secondary" onClick={() => void bulkPatch({ isActive: true }, 'Selected products made visible.')}>Make Visible</Button>
            <Button variant="secondary" onClick={() => void bulkPatch({ isActive: false }, 'Selected products hidden.')}>Hide</Button>
            <Button variant="secondary" onClick={() => void bulkPatch({ isFeatured: true }, 'Selected products marked featured.')}>Mark Featured</Button>
            <Button variant="secondary" onClick={() => void bulkPatch({ isBestseller: true }, 'Selected products marked bestseller.')}>Mark Bestseller</Button>
            <Button variant="secondary" onClick={() => void bulkPatch({ isNewArrival: true }, 'Selected products marked new arrival.')}>Mark New Arrival</Button>
            <Button variant="secondary" onClick={openBulkPriceModal}>Bulk Price</Button>
            <Button variant="danger" onClick={bulkArchive}>Archive</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      </div> : null}
    </>}
  </section>;
}
