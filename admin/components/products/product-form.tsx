// Governed by .rules v1.0
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, Eye, ImageIcon, Save, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { AdminActionBar, AdminCard, AdminFormSection, AdminSectionHeader, AdminTabs } from '@/components/dashboard/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { PRODUCT_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useCreateProduct, useUpdateProduct, useUploadSignature } from '@/hooks/useAdminMutations';
import { useAdminCategories, useAdminCollections, useAdminTags } from '@/hooks/useAdminResources';
import { externalUploadApi } from '@/lib/api';
import { adminProductSchema } from '@/lib/schemas';
import { cn, slugify } from '@/lib/utils';
import type { CollectionDto, ProductDto } from '@/types/dto.types';

export interface ProductFormProps {
  product?: ProductDto;
}

type ProductFormValues = z.infer<typeof adminProductSchema>;
type FormTab = 'basic' | 'media' | 'pricing' | 'inventory' | 'taxonomy' | 'shipping' | 'seo';
interface CloudinaryUploadResponse { secure_url?: string; }

const tabs: Array<{ value: FormTab; label: string; helper?: string }> = [
  { value: 'basic', label: 'Basic', helper: 'Title and status' },
  { value: 'media', label: 'Media', helper: 'Images and video' },
  { value: 'pricing', label: 'Pricing', helper: 'MRP and sale' },
  { value: 'inventory', label: 'Inventory', helper: 'SKU and stock' },
  { value: 'taxonomy', label: 'Categorization', helper: 'Categories and tags' },
  { value: 'shipping', label: 'Shipping', helper: 'Package data' },
  { value: 'seo', label: 'SEO', helper: 'Search preview' }
];

const itemId = (item: { id?: string; _id?: string; slug?: string }): string => item.id ?? item._id ?? item.slug ?? '';
const idList = <TItem extends { id?: string; _id?: string }>(items?: Array<string | TItem>): string => (items ?? []).map((item) => typeof item === 'string' ? item : item._id ?? item.id ?? '').filter(Boolean).join(', ');
const collectionLabel = (collection: CollectionDto): string => collection.title + (collection.isVisible ? '' : ' (hidden)');
const storefrontBaseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000';
const collapseRepeatedSlug = (value: string): string => {
  for (let size = 1; size <= value.length / 2; size += 1) {
    if (value.length % size === 0) {
      const part = value.slice(0, size);
      if (part && part.repeat(value.length / size) === value) return part;
    }
  }
  return value;
};
const normalizeProductSlug = (value: string, fallback: string): string => {
  const normalized = collapseRepeatedSlug(slugify(value || fallback));
  const fallbackSlug = slugify(fallback);
  if (fallbackSlug && normalized.startsWith(fallbackSlug + fallbackSlug)) return fallbackSlug + normalized.slice((fallbackSlug + fallbackSlug).length);
  return normalized;
};

const formValuesFromProduct = (product: ProductDto | undefined): Partial<ProductFormValues> => {
  if (!product) return {
    ...PRODUCT_FORM_DEFAULTS,
    title: '',
    slug: '',
    description: '',
    richDescription: '',
    category: '',
    basePrice: 0,
    sku: '',
    size: '',
    color: '',
    stock: 0,
    lowStockThreshold: 10,
    status: 'published',
    visibility: 'visible',
    gender: 'unisex'
  };
  const [image] = product.images ?? [];
  const [variant] = product.variants ?? [];
  const categoryId = typeof product.category === 'string' ? product.category : product.category?._id ?? product.category?.id ?? '';
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? '',
    shortDescription: product.shortDescription ?? '',
    richDescription: product.richDescription ?? '',
    category: categoryId,
    categoryIds: idList(product.categoryIds),
    collections: idList(product.collections),
    tags: product.tags?.join(', ') ?? '',
    gender: product.gender ?? 'unisex',
    status: product.status ?? (product.isActive ? 'published' : 'draft'),
    visibility: product.visibility ?? (product.isActive ? 'visible' : 'hidden'),
    isSale: product.isSale ?? Boolean(product.comparePrice),
    isFeatured: product.isFeatured,
    isBestseller: product.isBestseller ?? false,
    isNewArrival: product.isNewArrival ?? false,
    isLatestDrop: product.isLatestDrop ?? false,
    materialCare: product.materialCare ?? '',
    fitDetails: product.fitDetails ?? '',
    shippingReturns: product.shippingReturns ?? '',
    sizeGuide: product.sizeGuide ?? '',
    productHighlights: product.productHighlights?.join(', ') ?? '',
    pickupAddress: product.pickupAddress ?? '',
    lowStockThreshold: product.lowStockThreshold ?? 10,
    weight: product.weight,
    length: product.dimensions?.length,
    width: product.dimensions?.width,
    height: product.dimensions?.height,
    seoTitle: product.seo?.metaTitle ?? product.title,
    seoDescription: product.seo?.metaDesc ?? product.description ?? '',
    ogImage: product.seo?.ogImage ?? image?.url ?? PRODUCT_FORM_DEFAULTS.image,
    basePrice: product.basePrice,
    comparePrice: product.comparePrice,
    costPrice: product.costPrice,
    gstPercent: product.gstPercent,
    hsnCode: product.hsnCode ?? '',
    productCode: product.productCode ?? '',
    image: image?.url ?? variant?.images?.[0]?.url ?? PRODUCT_FORM_DEFAULTS.image,
    hoverImage: product.hoverImage?.url ?? '',
    videoUrl: product.videoUrl ?? '',
    mobileVideoUrl: product.mobileVideoUrl ?? '',
    videoPosterImage: product.videoPosterImage ?? '',
    imageAltText: product.imageAltText ?? image?.alt ?? product.title,
    sku: variant?.sku ?? '',
    size: variant?.size ?? '',
    color: variant?.color ?? '',
    colorHex: variant?.colorHex ?? PRODUCT_FORM_DEFAULTS.colorHex,
    stock: variant?.stock ?? 0
  };
};

export function ProductForm({ product }: ProductFormProps): ReactNode {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadSignature = useUploadSignature();
  const categories = useAdminCategories();
  const collections = useAdminCollections();
  const tags = useAdminTags();
  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<ProductFormValues>({ resolver: zodResolver(adminProductSchema), defaultValues: formValuesFromProduct(product) });
  const productId = product?.id ?? product?._id;
  const imagePreview = watch('image');
  const price = Number(watch('basePrice') ?? 0);
  const mrp = Number(watch('comparePrice') ?? 0);
  const selectedAdditionalCategories = watch('categoryIds') ?? '';
  const selectedCollections = watch('collections') ?? '';

  useEffect(() => { reset(formValuesFromProduct(product)); }, [product, reset]);

  const selectedCollectionCount = useMemo(() => selectedCollections.split(',').map((item) => item.trim()).filter(Boolean).length, [selectedCollections]);
  const saleHelper = mrp > 0 && price > 0 ? Math.max(0, Math.round(((mrp - price) / mrp) * 100)) + '% off MRP' : 'Set MRP to show markdown context.';

  const onDropHandler = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const sig = await uploadSignature.mutateAsync();
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('api_key', String(process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? ''));
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
      const response = await externalUploadApi.post<CloudinaryUploadResponse>(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
      if (response.data.secure_url) setValue('image', response.data.secure_url);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : COPY.products.uploadFailed });
    } finally {
      setUploading(false);
    }
  }, [setValue, uploadSignature]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: { 'image/*': [] }, maxFiles: 1, onDrop: onDropHandler });

  const updateCsvSelection = (field: 'categoryIds' | 'collections', id: string, checked: boolean): void => {
    const current = (watch(field) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const next = checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id);
    setValue(field, next.join(', '), { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (data: ProductFormValues): void => {
    setFeedback(null);
    const payload = { ...data, slug: normalizeProductSlug(data.slug, data.title) };
    if (productId) {
      updateProduct.mutate({ ...payload, id: productId }, { onSuccess: () => setFeedback({ type: 'success', message: COPY.products.updated }), onError: (error) => setFeedback({ type: 'error', message: error.message }) });
      return;
    }
    createProduct.mutate(payload, { onSuccess: () => router.push('/products'), onError: (error) => setFeedback({ type: 'error', message: error.message }) });
  };

  const isPending = createProduct.isPending || updateProduct.isPending || uploading;

  return <form onSubmit={handleSubmit(onSubmit)} className="grid min-w-0 gap-6">
    <AdminCard className="grid gap-5">
      <AdminSectionHeader eyebrow="Product Record" title={product ? product.title : COPY.products.new} description="Create a storefront-ready product with clean merchandising data, media, pricing, inventory, taxonomy, and SEO." action={<div className="flex flex-wrap gap-2"><Link href="/products" className="inline-flex h-11 items-center border border-border px-4 text-sm text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"><ArrowLeft size={15} className="mr-2" />Products</Link>{product?.slug ? <a href={storefrontBaseUrl + '/product/' + product.slug} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center border border-border px-4 text-sm text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"><Eye size={15} className="mr-2" />Preview</a> : null}</div>} />
      <AdminTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
    </AdminCard>

    {activeTab === 'basic' ? <AdminFormSection title="Basic Info" description="Use readable merchandising copy. Slug falls back to the title on save when left blank, but typed slugs are preserved." columns={2}>
      <Input label="Product Title *" error={formState.errors.title?.message} {...register('title')} />
      <Input label="Product Slug *" error={formState.errors.slug?.message} {...register('slug')} />
      <Input label="Product Short Description" error={formState.errors.shortDescription?.message} {...register('shortDescription')} />
      <Input label="Product Description *" error={formState.errors.description?.message} {...register('description')} />
      <label className="grid gap-2 md:col-span-2"><span className="text-xs uppercase tracking-[0.14em] text-text-muted">Product Rich Description *</span><textarea rows={5} {...register('richDescription')} className="min-h-32 border border-border bg-background-input px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent-gold" />{formState.errors.richDescription?.message ? <span className="text-sm text-danger">{formState.errors.richDescription.message}</span> : null}</label>
      <SelectField label="Status" options={[{ label: 'Published', value: 'published' }, { label: 'Draft', value: 'draft' }, { label: 'Archived', value: 'archived' }]} value={watch('status')} onChange={(event) => setValue('status', event.target.value as ProductFormValues['status'])} />
      <SelectField label="Visibility" options={[{ label: 'Visible', value: 'visible' }, { label: 'Hidden', value: 'hidden' }]} value={watch('visibility')} onChange={(event) => setValue('visibility', event.target.value as ProductFormValues['visibility'])} />
      <Toggle label="Featured" value={watch('isFeatured')} onChange={(value) => setValue('isFeatured', value)} />
      <Toggle label="Bestseller" value={watch('isBestseller')} onChange={(value) => setValue('isBestseller', value)} />
      <Toggle label="New Arrival" value={watch('isNewArrival')} onChange={(value) => setValue('isNewArrival', value)} />
      <Toggle label="Sale" value={watch('isSale')} onChange={(value) => setValue('isSale', value)} />
    </AdminFormSection> : null}

    {activeTab === 'media' ? <AdminFormSection title="Media" description="Add a primary image, optional hover image, video URLs, and useful alt text." columns={2}>
      <div className="grid gap-4 md:col-span-2 xl:grid-cols-[320px_1fr]">
        <div className="overflow-hidden border border-border bg-background-primary">{imagePreview ? <img src={String(imagePreview)} alt={watch('imageAltText') || COPY.products.previewAlt} className="aspect-[4/5] w-full object-cover" /> : <div className="grid aspect-[4/5] place-items-center text-text-muted"><ImageIcon size={28} /></div>}</div>
        <div {...getRootProps()} className={cn('grid min-h-44 place-items-center border border-dashed p-6 text-center text-text-secondary transition', isDragActive ? 'border-accent-gold' : 'border-border')}>
          <input {...getInputProps()} />
          <UploadCloud className="text-accent-gold" size={28} />
          <p className="mt-3 text-sm">{uploading ? COPY.products.uploading : COPY.products.uploader}</p>
          <p className="mt-1 text-xs text-text-muted">Or paste image URLs below.</p>
        </div>
      </div>
      <Input label="Main image URL *" error={formState.errors.image?.message} {...register('image')} />
      <Input label="Hover image URL" error={formState.errors.hoverImage?.message} {...register('hoverImage')} />
      <Input label="Product video URL" error={formState.errors.videoUrl?.message} {...register('videoUrl')} />
      <Input label="Mobile video URL" error={formState.errors.mobileVideoUrl?.message} {...register('mobileVideoUrl')} />
      <Input label="Video poster image" error={formState.errors.videoPosterImage?.message} {...register('videoPosterImage')} />
      <Input label="Image alt text" error={formState.errors.imageAltText?.message} {...register('imageAltText')} />
    </AdminFormSection> : null}

    {activeTab === 'pricing' ? <AdminFormSection title="Pricing" description="Selling price is used for checkout. MRP is display context for markdowns." columns={2}>
      <Input label="Selling price *" type="number" error={formState.errors.basePrice?.message} {...register('basePrice')} />
      <Input label="MRP / compare-at price" type="number" error={formState.errors.comparePrice?.message} {...register('comparePrice')} />
      <Input label="Cost price" type="number" error={formState.errors.costPrice?.message} {...register('costPrice')} />
      <Input label="GST %" type="number" error={formState.errors.gstPercent?.message} {...register('gstPercent')} />
      <Input label="HSN code" error={formState.errors.hsnCode?.message} {...register('hsnCode')} />
      <div className="border border-border bg-background-primary p-4 md:col-span-2"><p className="font-mono text-sm text-accent-gold">{saleHelper}</p><p className="mt-2 text-sm text-text-secondary">Cost price remains admin/API-only and is stripped from public storefront product payloads.</p></div>
    </AdminFormSection> : null}

    {activeTab === 'inventory' ? <AdminFormSection title="Inventory & Variants" description="This form edits the primary variant. Additional SKU creation can be added as a dedicated variant manager." columns={3}>
      <Input label="Product code" error={formState.errors.productCode?.message} {...register('productCode')} />
      <Input label="Main SKU *" error={formState.errors.sku?.message} {...register('sku')} />
      <Input label="Size *" error={formState.errors.size?.message} {...register('size')} />
      <Input label="Color *" error={formState.errors.color?.message} {...register('color')} />
      <Input label="Color hex *" error={formState.errors.colorHex?.message} {...register('colorHex')} />
      <Input label="Stock *" type="number" error={formState.errors.stock?.message} {...register('stock')} />
      <Input label="Low-stock threshold" type="number" error={formState.errors.lowStockThreshold?.message} {...register('lowStockThreshold')} />
    </AdminFormSection> : null}

    {activeTab === 'taxonomy' ? <AdminFormSection title="Categorization" description="Use selectors instead of raw category or collection IDs." columns={2}>
      <SelectField label="Primary category *" options={[{ label: 'Select category', value: '' }, ...(categories.data ?? []).map((category) => ({ label: (category.path ?? category.name), value: itemId(category) }))]} value={watch('category')} onChange={(event) => setValue('category', event.target.value, { shouldDirty: true, shouldValidate: true })} />
      <SelectField label="Gender / audience" options={[{ label: 'Unisex', value: 'unisex' }, { label: 'Men', value: 'men' }, { label: 'Women', value: 'women' }]} value={watch('gender')} onChange={(event) => setValue('gender', event.target.value as ProductFormValues['gender'])} />
      <SelectorGroup title="Additional categories" helper={selectedAdditionalCategories ? selectedAdditionalCategories.split(',').filter(Boolean).length + ' selected' : 'Optional'} className="md:col-span-2">{(categories.data ?? []).map((category) => { const id = itemId(category); return <Toggle key={id} label={category.path ?? category.name} value={selectedAdditionalCategories.split(',').map((item) => item.trim()).includes(id)} onChange={(checked) => updateCsvSelection('categoryIds', id, checked)} />; })}</SelectorGroup>
      <SelectorGroup title="Collections" helper={selectedCollectionCount + ' selected'} className="md:col-span-2">{(collections.data ?? []).map((collection) => { const id = itemId(collection); return <Toggle key={id} label={collectionLabel(collection)} value={selectedCollections.split(',').map((item) => item.trim()).includes(id)} onChange={(checked) => updateCsvSelection('collections', id, checked)} />; })}</SelectorGroup>
      <Input label="Tags" error={formState.errors.tags?.message} list="tag-options" {...register('tags')} />
      <datalist id="tag-options">{(tags.data ?? []).map((tag) => <option key={itemId(tag)} value={tag.name} />)}</datalist>
      <Input label="Product highlights" error={formState.errors.productHighlights?.message} {...register('productHighlights')} />
    </AdminFormSection> : null}

    {activeTab === 'shipping' ? <AdminFormSection title="Shipping & Attributes" description="Package dimensions improve fulfilment accuracy; attributes help product detail pages." columns={3}>
      <Input label="Weight" type="number" error={formState.errors.weight?.message} {...register('weight')} />
      <Input label="Length" type="number" error={formState.errors.length?.message} {...register('length')} />
      <Input label="Width" type="number" error={formState.errors.width?.message} {...register('width')} />
      <Input label="Height" type="number" error={formState.errors.height?.message} {...register('height')} />
      <Input label="Pickup / warehouse code" error={formState.errors.pickupAddress?.message} {...register('pickupAddress')} />
      <Input label="Fit details" error={formState.errors.fitDetails?.message} {...register('fitDetails')} />
      <Input label="Material & care" error={formState.errors.materialCare?.message} {...register('materialCare')} />
      <Input label="Shipping & returns" error={formState.errors.shippingReturns?.message} {...register('shippingReturns')} />
      <Input label="Size guide" error={formState.errors.sizeGuide?.message} {...register('sizeGuide')} />
    </AdminFormSection> : null}

    {activeTab === 'seo' ? <AdminFormSection title="SEO" description="Search preview fields remain admin-only and feed the product SEO payload." columns={2}>
      <Input label="SEO title" error={formState.errors.seoTitle?.message} {...register('seoTitle')} />
      <Input label="OG image" error={formState.errors.ogImage?.message} {...register('ogImage')} />
      <label className="grid gap-2 md:col-span-2"><span className="text-xs uppercase tracking-[0.14em] text-text-muted">SEO description</span><textarea rows={4} {...register('seoDescription')} className="border border-border bg-background-input px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent-gold" /></label>
      <div className="border border-border bg-background-primary p-4 md:col-span-2"><p className="text-sm text-text-primary">{watch('seoTitle') || watch('title') || 'Product title'}</p><p className="mt-1 font-mono text-xs text-accent-gold">/product/{watch('slug') || 'product-slug'}</p><p className="mt-2 text-sm text-text-secondary">{watch('seoDescription') || watch('description') || 'Product description preview.'}</p></div>
    </AdminFormSection> : null}

    {feedback ? <p className={feedback.type === 'error' ? 'text-sm text-danger' : 'text-sm text-success'} aria-live="polite">{feedback.message}</p> : null}
    <AdminActionBar>
      <Button type="button" variant="secondary" onClick={() => router.push('/products')}>Cancel</Button>
      {productId ? <Button type="button" variant="danger" onClick={() => setValue('status', 'archived')}><Archive size={15} className="mr-2" />Mark Archived</Button> : null}
      <Button type="submit" disabled={isPending}><Save size={15} className="mr-2" />{isPending ? COPY.products.saving : productId ? 'Save Changes' : 'Create Product'}</Button>
    </AdminActionBar>
  </form>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactNode {
  return <label className="flex min-h-11 min-w-0 items-center gap-3 border border-border bg-background-primary px-3 text-sm text-text-secondary"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-accent-gold" /><span className="min-w-0 truncate">{label}</span></label>;
}

function SelectorGroup({ title, helper, children, className }: { title: string; helper: string; children: ReactNode; className?: string }): ReactNode {
  return <div className={cn('grid gap-3 border border-border bg-background-primary p-4', className)}>
    <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-text-muted">{title}</p><p className="text-xs text-accent-gold">{helper}</p></div>
    <div className="grid max-h-64 gap-2 overflow-auto pr-1 md:grid-cols-2">{children}</div>
  </div>;
}
