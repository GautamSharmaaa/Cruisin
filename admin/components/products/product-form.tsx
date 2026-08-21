// Governed by .rules v1.0
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AxiosResponse } from 'axios';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Archive, Eye, ImageIcon, ImagePlus, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { AdminActionBar, AdminCard, AdminFormSection, AdminSectionHeader, AdminTabs } from '@/components/dashboard/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { PRODUCT_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useCreateProduct, useUpdateProduct, useUploadSignature } from '@/hooks/useAdminMutations';
import { useAdminCategories, useAdminCollections, useAdminProducts, useAdminTags } from '@/hooks/useAdminResources';
import { externalUploadApi } from '@/lib/api';
import { adminProductSchema } from '@/lib/schemas';
import { cn, slugify } from '@/lib/utils';
import { MAX_VARIANT_IMAGES, appendOrderedUploads, moveOrderedImage, parseOrderedImageUrls, setOrderedImagesForColor } from '@/lib/variant-media';
import type { CollectionDto, ProductDto } from '@/types/dto.types';

export interface ProductFormProps {
  product?: ProductDto;
}

type ProductFormValues = z.infer<typeof adminProductSchema>;
type FormTab = 'basic' | 'media' | 'pricing' | 'inventory' | 'taxonomy' | 'merchandising' | 'shipping' | 'seo';
interface CloudinaryUploadResponse { secure_url?: string; }

const tabs: Array<{ value: FormTab; label: string; helper?: string }> = [
  { value: 'basic', label: 'Basic', helper: 'Title and status' },
  { value: 'media', label: 'Media', helper: 'Images and video' },
  { value: 'pricing', label: 'Pricing', helper: 'MRP and sale' },
  { value: 'inventory', label: 'Inventory', helper: 'SKU and stock' },
  { value: 'taxonomy', label: 'Categorization', helper: 'Categories and tags' },
  { value: 'merchandising', label: 'Complete the Fit', helper: 'Bag bundles' },
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

const emptyVariant = (images: string[] = [PRODUCT_FORM_DEFAULTS.image]): ProductFormValues['variants'][number] => ({
  sku: '',
  size: '',
  color: '',
  colorHex: PRODUCT_FORM_DEFAULTS.colorHex,
  stock: 0,
  enabled: true,
  images: [...images]
});

const skuPart = (value: string): string => slugify(value).replaceAll('-', '').toUpperCase().slice(0, 12) || 'VAR';

const formValuesFromProduct = (product: ProductDto | undefined): Partial<ProductFormValues> => {
  if (!product) return {
    ...PRODUCT_FORM_DEFAULTS,
    title: '',
    slug: '',
    description: '',
    richDescription: '',
    category: '',
    basePrice: 0,
    variants: [emptyVariant()],
    lowStockThreshold: 10,
    maximumQuantityPerPackage: 10,
    status: 'published',
    visibility: 'visible',
    gender: 'unisex',
    completeTheFitEnabled: true,
    completeTheFitStrategy: 'frequently_bought_together',
    completeTheFitTitle: 'Complete The Fit',
    completeTheFitEyebrow: 'Your kit is building',
    completeTheFitDescription: 'Explore one more piece.',
    recommendedProducts: '',
    bundleDiscountEnabled: true,
    bundleTwoItemDiscount: 100,
    bundleThreeItemDiscount: 300
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
    completeTheFitEnabled: product.completeTheFit?.enabled ?? true,
    completeTheFitStrategy: product.completeTheFit?.strategy ?? 'frequently_bought_together',
    completeTheFitTitle: product.completeTheFit?.title ?? 'Complete The Fit',
    completeTheFitEyebrow: product.completeTheFit?.eyebrow ?? 'Your kit is building',
    completeTheFitDescription: product.completeTheFit?.description ?? 'Explore one more piece.',
    recommendedProducts: idList(product.recommendedProducts),
    bundleDiscountEnabled: product.completeTheFit?.bundleDiscount?.enabled ?? true,
    bundleTwoItemDiscount: product.completeTheFit?.bundleDiscount?.twoItemDiscount ?? 100,
    bundleThreeItemDiscount: product.completeTheFit?.bundleDiscount?.threeItemDiscount ?? 300,
    materialCare: product.materialCare ?? '',
    fitDetails: product.fitDetails ?? '',
    shippingReturns: product.shippingReturns ?? '',
    sizeGuide: product.sizeGuide ?? '',
    productHighlights: product.productHighlights?.join(', ') ?? '',
    pickupAddress: product.pickupAddress ?? '',
    lowStockThreshold: product.lowStockThreshold ?? 10,
    weight: product.weight ?? PRODUCT_FORM_DEFAULTS.weight,
    length: product.dimensions?.length ?? PRODUCT_FORM_DEFAULTS.length,
    width: product.dimensions?.width ?? PRODUCT_FORM_DEFAULTS.width,
    height: product.dimensions?.height ?? PRODUCT_FORM_DEFAULTS.height,
    packagingWeight: product.packagingWeight ?? PRODUCT_FORM_DEFAULTS.packagingWeight,
    defaultPackagePreset: product.defaultPackagePreset ?? '',
    maximumQuantityPerPackage: product.maximumQuantityPerPackage ?? 10,
    seoTitle: product.seo?.metaTitle ?? product.title,
    seoDescription: product.seo?.metaDesc ?? product.description ?? '',
    ogImage: product.seo?.ogImage ?? image?.url ?? PRODUCT_FORM_DEFAULTS.image,
    basePrice: product.basePrice,
    comparePrice: product.comparePrice,
    costPrice: product.costPrice,
    manufacturingCost: product.costBreakdown?.manufacturing ?? product.costPrice ?? 0,
    packagingCost: product.costBreakdown?.packaging ?? 0,
    marketingCost: product.costBreakdown?.marketing ?? 0,
    handlingCost: product.costBreakdown?.handling ?? 0,
    otherCost: product.costBreakdown?.other ?? 0,
    gstPercent: product.gstPercent,
    hsnCode: product.hsnCode ?? '',
    productCode: product.productCode ?? '',
    image: image?.url ?? variant?.images?.[0]?.url ?? PRODUCT_FORM_DEFAULTS.image,
    hoverImage: product.hoverImage?.url ?? '',
    videoUrl: product.videoUrl ?? '',
    mobileVideoUrl: product.mobileVideoUrl ?? '',
    videoPosterImage: product.videoPosterImage ?? '',
    imageAltText: product.imageAltText ?? image?.alt ?? product.title,
    variants: (product.variants?.length ? product.variants : [variant].filter(Boolean)).map((item) => ({
      _id: item?._id ?? item?.id,
      sku: item?.sku ?? '',
      size: item?.size ?? '',
      color: item?.color ?? '',
      colorHex: item?.colorHex ?? PRODUCT_FORM_DEFAULTS.colorHex,
      stock: item?.stock ?? 0,
      priceOverride: item?.priceOverride,
      lowStockThreshold: item?.lowStockThreshold,
      enabled: item?.enabled !== false,
      images: item?.images?.length ? item.images.map((variantImage) => variantImage.url) : [image?.url ?? PRODUCT_FORM_DEFAULTS.image]
    }))
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
  const productCatalogue = useAdminProducts({ status: 'all', sort: 'title-asc', limit: 100 });
  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { register, handleSubmit, formState, setValue, watch, reset, control, getValues, trigger } = useForm<ProductFormValues>({ resolver: zodResolver(adminProductSchema), defaultValues: formValuesFromProduct(product) });
  const { fields: variantFields, append: appendVariant, remove: removeVariant, replace: replaceVariants } = useFieldArray({ control, name: 'variants' });
  const productId = product?.id ?? product?._id;
  const imagePreview = watch('image');
  const price = Number(watch('basePrice') ?? 0);
  const mrp = Number(watch('comparePrice') ?? 0);
  const selectedAdditionalCategories = watch('categoryIds') ?? '';
  const selectedCollections = watch('collections') ?? '';
  const watchedVariants = watch('variants') ?? [];
  const variantValidationKey = useMemo(() => watchedVariants.map((variant) => [variant.sku, variant.color, variant.size, variant.colorHex, variant.images.join('~')].join('|')).join('::'), [watchedVariants]);
  const [newColor, setNewColor] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newColorImages, setNewColorImages] = useState('');
  const [newSize, setNewSize] = useState('');
  const [merchandisingSearch, setMerchandisingSearch] = useState('');
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);

  useEffect(() => { reset(formValuesFromProduct(product)); }, [product, reset]);
  useEffect(() => {
    if (formState.submitCount > 0) void trigger('variants');
  }, [formState.submitCount, trigger, variantValidationKey]);

  const selectedCollectionCount = useMemo(() => selectedCollections.split(',').map((item) => item.trim()).filter(Boolean).length, [selectedCollections]);
  const saleHelper = mrp > 0 && price > 0 ? Math.max(0, Math.round(((mrp - price) / mrp) * 100)) + '% off MRP' : 'Set MRP to show markdown context.';
  const colors = useMemo(() => Array.from(new Map(watchedVariants.filter((variant) => variant.color.trim()).map((variant) => [variant.color.trim().toLowerCase(), { label: variant.color.trim(), hex: variant.colorHex, images: variant.images }])).values()), [watchedVariants]);
  const sizes = useMemo(() => Array.from(new Set(watchedVariants.map((variant) => variant.size.trim()).filter(Boolean))), [watchedVariants]);
  const selectedRecommendedIds = useMemo(() => (watch('recommendedProducts') ?? '').split(',').map((id) => id.trim()).filter(Boolean), [watch('recommendedProducts')]);
  const selectableRecommendations = useMemo(() => {
    const query = merchandisingSearch.trim().toLowerCase();
    return (productCatalogue.data?.items ?? []).filter((candidate) => itemId(candidate) !== productId && !selectedRecommendedIds.includes(itemId(candidate)) && (!query || candidate.title.toLowerCase().includes(query) || candidate.slug.toLowerCase().includes(query))).slice(0, 24);
  }, [merchandisingSearch, productCatalogue.data?.items, productId, selectedRecommendedIds]);

  const generatedSku = (color: string, size: string, offset: number): string => {
    const base = getValues('productCode') || getValues('slug') || getValues('title') || 'QA-VARIANT';
    return [skuPart(base), skuPart(color), skuPart(size || String(offset + 1))].join('-');
  };

  const addColor = (): void => {
    const label = newColor.trim();
    const hex = newColorHex.trim().toUpperCase();
    if (!label || !/^#[0-9A-F]{6}$/.test(hex)) {
      setFeedback({ type: 'error', message: 'Add a color name and a valid six-digit HEX value.' });
      return;
    }
    if (colors.some((color) => color.label.toLowerCase() === label.toLowerCase())) {
      setFeedback({ type: 'error', message: `${label} already exists.` });
      return;
    }
    const current = getValues('variants');
    const meaningful = current.filter((variant) => variant.sku || variant.size || variant.color);
    const complete = current.filter((variant) => variant.color.trim() && variant.size.trim());
    const targetSizes = sizes.length ? sizes : [''];
    const images = parseOrderedImageUrls(newColorImages);
    const orderedImages = images.length ? images : [getValues('image') || PRODUCT_FORM_DEFAULTS.image];
    const additions = targetSizes.map((size, index) => ({ ...emptyVariant(orderedImages), color: label, colorHex: hex, size, sku: generatedSku(label, size, meaningful.length + index) }));
    const partialColors = current.filter((variant) => variant.color.trim() && !variant.size.trim());
    replaceVariants(targetSizes[0] ? [...complete, ...additions] : [...partialColors, ...additions]);
    setNewColor('');
    setNewColorImages('');
    setFeedback({ type: 'success', message: sizes.length ? `${label} added across ${targetSizes.length} size${targetSizes.length === 1 ? '' : 's'}.` : `${label} added. Add a size to generate sellable combinations.` });
  };

  const addSize = (): void => {
    const size = newSize.trim().toUpperCase();
    if (!size) {
      setFeedback({ type: 'error', message: 'Enter a size before adding it.' });
      return;
    }
    if (sizes.some((candidate) => candidate.toLowerCase() === size.toLowerCase())) {
      setFeedback({ type: 'error', message: `Size ${size} already exists.` });
      return;
    }
    const current = getValues('variants');
    const meaningful = current.filter((variant) => variant.sku || variant.size || variant.color);
    const complete = current.filter((variant) => variant.color.trim() && variant.size.trim());
    const targetColors = colors.length ? colors : [{ label: '', hex: PRODUCT_FORM_DEFAULTS.colorHex, images: [getValues('image') || PRODUCT_FORM_DEFAULTS.image] }];
    const additions = targetColors.map((color, index) => ({ ...emptyVariant(color.images), color: color.label, colorHex: color.hex, size, sku: generatedSku(color.label, size, meaningful.length + index) }));
    const partialSizes = current.filter((variant) => variant.size.trim() && !variant.color.trim());
    replaceVariants(targetColors[0]?.label ? [...complete, ...additions] : [...partialSizes, ...additions]);
    setNewSize('');
    setFeedback({ type: 'success', message: colors.length ? `Size ${size} added across ${targetColors.length} color${targetColors.length === 1 ? '' : 's'}.` : `Size ${size} added. Add a color to generate sellable combinations.` });
  };

  const uploadFiles = useCallback(async (files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    const sig = await uploadSignature.mutateAsync();
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', String(process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? ''));
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
      let response: AxiosResponse<CloudinaryUploadResponse>;
      try {
        response = await externalUploadApi.post<CloudinaryUploadResponse>(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
      } catch (error) {
        if (error instanceof Error && /timeout/i.test(error.message)) {
          throw new Error(`Upload timed out for ${file.name}. Check the connection and retry this image.`);
        }
        throw error;
      }
      if (!response.data.secure_url) throw new Error(`Upload failed for ${file.name}`);
      urls.push(response.data.secure_url);
    }
    return urls;
  }, [uploadSignature]);

  const onDropHandler = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const [url] = await uploadFiles(files.slice(0, 1));
      if (url) setValue('image', url);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : COPY.products.uploadFailed });
    } finally {
      setUploading(false);
    }
  }, [setValue, uploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: { 'image/*': [] }, maxFiles: 1, onDrop: onDropHandler });

  const setColorImages = (color: string, images: string[]): void => {
    setValue('variants', setOrderedImagesForColor(getValues('variants'), color, images), { shouldDirty: true, shouldValidate: true });
  };

  const uploadColorImages = async (color: string, files: File[]): Promise<void> => {
    if (!files.length) return;
    const existing = colors.find((candidate) => candidate.label.toLowerCase() === color.toLowerCase())?.images ?? [];
    if (existing.length + files.length > MAX_VARIANT_IMAGES) {
      setFeedback({ type: 'error', message: `${color} can use up to ${MAX_VARIANT_IMAGES} photos.` });
      return;
    }
    setUploading(true);
    setUploadingColor(color);
    setFeedback(null);
    try {
      const uploaded = await uploadFiles(files);
      setColorImages(color, appendOrderedUploads(existing, uploaded, [PRODUCT_FORM_DEFAULTS.image, getValues('image')]));
      setFeedback({ type: 'success', message: `${uploaded.length} ${color} photo${uploaded.length === 1 ? '' : 's'} uploaded in the selected order and applied to every ${color} size.` });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : COPY.products.uploadFailed });
    } finally {
      setUploading(false);
      setUploadingColor(null);
    }
  };

  const updateCsvSelection = (field: 'categoryIds' | 'collections', id: string, checked: boolean): void => {
    const current = (watch(field) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const next = checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id);
    setValue(field, next.join(', '), { shouldDirty: true, shouldValidate: true });
  };

  const setRecommendedProducts = (ids: string[]): void => {
    setValue('recommendedProducts', Array.from(new Set(ids)).join(', '), { shouldDirty: true, shouldValidate: true });
  };
  const moveRecommendedProduct = (index: number, offset: -1 | 1): void => {
    const target = index + offset;
    if (target < 0 || target >= selectedRecommendedIds.length) return;
    const next = [...selectedRecommendedIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setRecommendedProducts(next);
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

  const onInvalid = (errors: FieldErrors<ProductFormValues>): void => {
    const firstField = Object.keys(errors)[0] as keyof ProductFormValues | undefined;
    const tabByField: Partial<Record<keyof ProductFormValues, FormTab>> = {
      title: 'basic', slug: 'basic', description: 'basic', richDescription: 'basic', shortDescription: 'basic', status: 'basic', visibility: 'basic',
      image: 'media', hoverImage: 'media', videoUrl: 'media', mobileVideoUrl: 'media', videoPosterImage: 'media', imageAltText: 'media',
      basePrice: 'pricing', comparePrice: 'pricing', costPrice: 'pricing', manufacturingCost: 'pricing', packagingCost: 'pricing', marketingCost: 'pricing', handlingCost: 'pricing', otherCost: 'pricing', gstPercent: 'pricing', hsnCode: 'pricing',
      variants: 'inventory', productCode: 'inventory', lowStockThreshold: 'inventory',
      category: 'taxonomy', categoryIds: 'taxonomy', collections: 'taxonomy', tags: 'taxonomy', gender: 'taxonomy', productHighlights: 'taxonomy',
      completeTheFitEnabled: 'merchandising', completeTheFitStrategy: 'merchandising', completeTheFitTitle: 'merchandising', completeTheFitEyebrow: 'merchandising', completeTheFitDescription: 'merchandising', recommendedProducts: 'merchandising', bundleDiscountEnabled: 'merchandising', bundleTwoItemDiscount: 'merchandising', bundleThreeItemDiscount: 'merchandising',
      materialCare: 'shipping', fitDetails: 'shipping', shippingReturns: 'shipping', sizeGuide: 'shipping', pickupAddress: 'shipping', weight: 'shipping', length: 'shipping', width: 'shipping', height: 'shipping', packagingWeight: 'shipping', defaultPackagePreset: 'shipping', maximumQuantityPerPackage: 'shipping',
      seoTitle: 'seo', seoDescription: 'seo', ogImage: 'seo'
    };
    if (firstField && tabByField[firstField]) setActiveTab(tabByField[firstField]);
    setFeedback({ type: 'error', message: firstField ? `Review the highlighted ${String(firstField)} field before saving.` : 'Review the highlighted fields before saving.' });
  };

  const isPending = createProduct.isPending || updateProduct.isPending || uploading;

  return <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid min-w-0 gap-6">
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
      <Input label="Manufacturing cost / unit" type="number" min={0} step="0.01" error={formState.errors.manufacturingCost?.message} {...register('manufacturingCost')} />
      <Input label="Packaging cost / unit" type="number" min={0} step="0.01" error={formState.errors.packagingCost?.message} {...register('packagingCost')} />
      <Input label="Marketing allocation / unit" type="number" min={0} step="0.01" error={formState.errors.marketingCost?.message} {...register('marketingCost')} />
      <Input label="Handling cost / unit" type="number" min={0} step="0.01" error={formState.errors.handlingCost?.message} {...register('handlingCost')} />
      <Input label="Other cost / unit" type="number" min={0} step="0.01" error={formState.errors.otherCost?.message} {...register('otherCost')} />
      <Input label="GST %" type="number" error={formState.errors.gstPercent?.message} {...register('gstPercent')} />
      <Input label="HSN code" error={formState.errors.hsnCode?.message} {...register('hsnCode')} />
      <div className="border border-border bg-background-primary p-4 md:col-span-2"><p className="font-mono text-sm text-accent-gold">{saleHelper}</p><p className="mt-2 text-sm text-text-secondary">Internal costs are per unit, summed into cost price, snapshotted on orders, and never exposed to the storefront.</p></div>
    </AdminFormSection> : null}

    {activeTab === 'inventory' ? <AdminFormSection title="Inventory & Variants" description="Build a complete color-size matrix. Every combination keeps its own SKU, stock, availability, image, optional price, and low-stock threshold." columns={1}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <Input label="Product code" error={formState.errors.productCode?.message} {...register('productCode')} />
        <Input label="Default low-stock threshold" type="number" min={0} error={formState.errors.lowStockThreshold?.message} {...register('lowStockThreshold')} />
        <div className="flex h-12 min-w-40 items-center border border-border bg-background-primary px-4 text-sm text-text-secondary">
          <span className="font-mono text-accent-gold">{variantFields.length}</span>
          <span className="ml-2">combination{variantFields.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="grid gap-4 border border-border bg-background-primary p-4" aria-labelledby="add-color-heading">
          <div>
            <h3 id="add-color-heading" className="font-display text-xl text-text-primary">Add Color</h3>
            <p className="mt-1 text-sm text-text-secondary">Creates this color for every existing size. After adding it, upload and order its complete PDP gallery directly from your laptop.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
            <Input label="New color name" value={newColor} onChange={(event) => setNewColor(event.target.value)} />
            <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary">
              <span>New color HEX</span>
              <span className="mt-2 flex h-12 items-center gap-3 border border-border-subtle bg-background-input px-3">
                <input type="color" aria-label="New color visual picker" value={newColorHex} onChange={(event) => setNewColorHex(event.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
                <input aria-label="New color HEX value" value={newColorHex} onChange={(event) => setNewColorHex(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase text-text-primary outline-none" />
              </span>
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.14em] text-text-muted">Optional photo URLs</span>
            <textarea
              rows={4}
              value={newColorImages}
              placeholder={`Optional fallback: one URL per line. For laptop photos, add the color first and use Upload photos. Leave blank to start with ${String(imagePreview || PRODUCT_FORM_DEFAULTS.image)}`}
              onChange={(event) => setNewColorImages(event.target.value)}
              className="border border-border bg-background-input px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent-gold"
            />
          </label>
          <div><Button type="button" onClick={addColor}><Plus size={15} className="mr-2" />Add Color</Button></div>
        </section>

        <section className="grid content-start gap-4 border border-border bg-background-primary p-4" aria-labelledby="add-size-heading">
          <div>
            <h3 id="add-size-heading" className="font-display text-xl text-text-primary">Add Size</h3>
            <p className="mt-1 text-sm text-text-secondary">Creates this size for every existing color, preserving each color image and visual value.</p>
          </div>
          <Input label="New size" value={newSize} placeholder="S, M, XL, 32…" onChange={(event) => setNewSize(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={addSize}><Plus size={15} className="mr-2" />Add Size</Button>
            <Button type="button" variant="secondary" onClick={() => appendVariant(emptyVariant([getValues('image') || PRODUCT_FORM_DEFAULTS.image]))}><Plus size={15} className="mr-2" />Add Variant</Button>
          </div>
        </section>
      </div>

      {formState.errors.variants?.root?.message ? <p className="text-sm text-danger" role="alert">{formState.errors.variants.root.message}</p> : null}

      {colors.length ? <div className="grid gap-4">
        <div>
          <h3 className="font-display text-2xl text-text-primary">Color photo order</h3>
          <p className="mt-1 text-sm text-text-secondary">Upload once per color, then move photos into storefront gallery order. The exact ordered list is synchronized to every size of that color.</p>
        </div>
        {colors.map((color) => {
          const images = color.images ?? [];
          const colorVariantCount = watchedVariants.filter((variant) => variant.color.trim().toLowerCase() === color.label.toLowerCase()).length;
          const imageErrors = watchedVariants.findIndex((variant) => variant.color.trim().toLowerCase() === color.label.toLowerCase());
          const mediaError = imageErrors >= 0 ? formState.errors.variants?.[imageErrors]?.images : undefined;
          return <section key={color.label.toLowerCase()} className="grid gap-4 border border-border bg-background-elevated p-4 sm:p-5" aria-labelledby={`color-media-${slugify(color.label)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-10 w-10 rounded-full border border-border shadow-inner" style={{ backgroundColor: color.hex }} />
                <div>
                  <h4 id={`color-media-${slugify(color.label)}`} className="font-display text-xl text-text-primary">{color.label}</h4>
                  <p className="text-sm text-text-secondary">{images.length} of {MAX_VARIANT_IMAGES} photos · shared across {colorVariantCount} size{colorVariantCount === 1 ? '' : 's'}</p>
                </div>
              </div>
              <label className={cn('inline-flex h-11 cursor-pointer items-center border border-border px-4 text-sm text-text-primary transition hover:border-accent-gold hover:text-accent-gold', uploadingColor === color.label && 'cursor-wait opacity-60')}>
                <ImagePlus size={15} className="mr-2" />
                {uploadingColor === color.label ? 'Uploading in order…' : 'Upload photos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  aria-label={`Upload ordered photos for ${color.label}`}
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    void uploadColorImages(color.label, files);
                  }}
                />
              </label>
            </div>
            {mediaError?.message ? <p className="text-sm text-danger" role="alert">{String(mediaError.message)}</p> : null}
            <div className="grid gap-3">
              {images.map((url, index) => <div key={`${url}-${index}`} className="grid min-w-0 gap-3 border border-border bg-background-primary p-3 md:grid-cols-[64px_44px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative aspect-[3/4] overflow-hidden border border-border bg-background-elevated">
                  {url ? <img src={url} alt={`${color.label} gallery position ${index + 1}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-text-muted"><ImageIcon size={18} /></div>}
                </div>
                <span className="font-mono text-sm text-accent-gold">#{index + 1}</span>
                <label className="grid min-w-0 gap-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                  Photo URL
                  <input
                    type="url"
                    value={url}
                    aria-label={`${color.label} photo ${index + 1} URL`}
                    onChange={(event) => {
                      const next = [...images];
                      next[index] = event.target.value;
                      setColorImages(color.label, next);
                    }}
                    className="h-11 min-w-0 border border-border bg-background-input px-3 font-mono text-xs normal-case tracking-normal text-text-primary outline-none focus:border-accent-gold"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" aria-label={`Move ${color.label} photo ${index + 1} up`} disabled={index === 0} onClick={() => setColorImages(color.label, moveOrderedImage(images, index, index - 1))}><ArrowUp size={15} /></Button>
                  <Button type="button" variant="secondary" aria-label={`Move ${color.label} photo ${index + 1} down`} disabled={index === images.length - 1} onClick={() => setColorImages(color.label, moveOrderedImage(images, index, index + 1))}><ArrowDown size={15} /></Button>
                  <Button type="button" variant="danger" aria-label={`Remove ${color.label} photo ${index + 1}`} disabled={images.length === 1} onClick={() => setColorImages(color.label, images.filter((_, imageIndex) => imageIndex !== index))}><Trash2 size={15} /></Button>
                </div>
              </div>)}
              <Button type="button" variant="secondary" disabled={images.length >= MAX_VARIANT_IMAGES} onClick={() => setColorImages(color.label, [...images, ''])}><Plus size={15} className="mr-2" />Add photo URL</Button>
            </div>
          </section>;
        })}
      </div> : null}

      <div className="grid gap-4">
        {variantFields.map((field, index) => {
          const current = watchedVariants[index];
          const variantError = formState.errors.variants?.[index];
          const label = current?.color && current?.size ? `${current.color} / ${current.size}` : `Variant ${index + 1}`;
          return <section key={field.id} className="grid gap-4 border border-border bg-background-elevated p-4 sm:p-5" aria-labelledby={`variant-${field.id}-heading`}>
            <input type="hidden" {...register(`variants.${index}._id` as const)} />
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-full border border-border shadow-inner" style={{ backgroundColor: current?.colorHex || PRODUCT_FORM_DEFAULTS.colorHex }} />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-gold">Combination {index + 1}</p>
                  <h3 id={`variant-${field.id}-heading`} className="truncate font-display text-xl text-text-primary">{label}</h3>
                </div>
              </div>
              <Button type="button" variant="danger" disabled={variantFields.length === 1} aria-label={`Remove ${label}`} title={variantFields.length === 1 ? 'A product must keep at least one variant.' : `Remove ${label}`} onClick={() => {
                if (window.confirm(`Remove ${label}? This only affects the unsaved product form.`)) removeVariant(index);
              }}><Trash2 size={15} className="mr-2" />Remove</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input label={index === 0 ? 'Main SKU *' : `Variant ${index + 1} SKU *`} error={variantError?.sku?.message} {...register(`variants.${index}.sku` as const)} />
              <Input label={index === 0 ? 'Size *' : `Variant ${index + 1} size *`} error={variantError?.size?.message} {...register(`variants.${index}.size` as const)} />
              <Input label={index === 0 ? 'Color *' : `Variant ${index + 1} color *`} error={variantError?.color?.message} {...register(`variants.${index}.color` as const)} />
              <Input label={index === 0 ? 'Color hex *' : `Variant ${index + 1} color hex *`} error={variantError?.colorHex?.message} {...register(`variants.${index}.colorHex` as const)} />
              <Input label={index === 0 ? 'Stock *' : `Variant ${index + 1} stock *`} type="number" min={0} error={variantError?.stock?.message} {...register(`variants.${index}.stock` as const)} />
              <Input label="Price override" type="number" min={0} step="0.01" error={variantError?.priceOverride?.message} {...register(`variants.${index}.priceOverride` as const)} />
              <Input label="Variant low-stock threshold" type="number" min={0} error={variantError?.lowStockThreshold?.message} {...register(`variants.${index}.lowStockThreshold` as const)} />
              <Toggle label="Enabled for sale" value={current?.enabled !== false} onChange={(enabled) => setValue(`variants.${index}.enabled`, enabled, { shouldDirty: true, shouldValidate: true })} />
              <div className="md:col-span-2 xl:col-span-4">
                <p className="border border-border bg-background-primary px-3 py-3 text-sm text-text-secondary">{current?.images.length ?? 0} ordered {current?.color || 'color'} photo{current?.images.length === 1 ? '' : 's'} attached. Manage their order in the color photo section above.</p>
              </div>
            </div>
          </section>;
        })}
      </div>
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

    {activeTab === 'merchandising' ? <AdminFormSection title="Complete the Fit" description="Control the product rail shown in the Bag and Bag drawer. Choose a live sales signal or hand-pick products in the exact storefront order." columns={1}>
      <div className="grid gap-4 md:grid-cols-2">
        <Toggle label="Show Complete the Fit in the Bag" value={watch('completeTheFitEnabled')} onChange={(value) => setValue('completeTheFitEnabled', value, { shouldDirty: true })} />
        <SelectField label="Product source" options={[
          { label: 'Frequently bought together', value: 'frequently_bought_together' },
          { label: 'Best sellers / hot selling', value: 'best_sellers' },
          { label: 'Manual product selection', value: 'manual' }
        ]} value={watch('completeTheFitStrategy')} onChange={(event) => setValue('completeTheFitStrategy', event.target.value as ProductFormValues['completeTheFitStrategy'], { shouldDirty: true })} />
        <Input label="Section title" error={formState.errors.completeTheFitTitle?.message} {...register('completeTheFitTitle')} />
        <Input label="Progress eyebrow" error={formState.errors.completeTheFitEyebrow?.message} {...register('completeTheFitEyebrow')} />
        <Input label="Supporting copy" error={formState.errors.completeTheFitDescription?.message} {...register('completeTheFitDescription')} />
      </div>

      <section className="grid gap-4 border border-accent-gold/40 bg-background-primary p-4 sm:p-5" aria-labelledby="bundle-discount-heading">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-gold">Automatic incentive</p>
          <h3 id="bundle-discount-heading" className="mt-2 font-display text-2xl text-text-primary">Bundle discount</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">The saving is applied automatically in Bag and enforced again by Checkout. Every eligible unit counts toward the reward, including multiple quantities of the same product.</p>
        </div>
        <Toggle label="Enable automatic bundle discount" value={watch('bundleDiscountEnabled')} onChange={(value) => setValue('bundleDiscountEnabled', value, { shouldDirty: true })} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="2-item saving (max ₹100)" type="number" min={0} max={100} step="1" error={formState.errors.bundleTwoItemDiscount?.message} {...register('bundleTwoItemDiscount')} />
          <Input label="3-item total saving (max ₹300)" type="number" min={0} max={300} step="1" error={formState.errors.bundleThreeItemDiscount?.message} {...register('bundleThreeItemDiscount')} />
        </div>
        <div className="border border-border bg-background-elevated p-4 text-sm text-text-secondary">
          Customer message preview: {watch('bundleDiscountEnabled')
            ? `Add 1 more item to get ₹${Number(watch('bundleTwoItemDiscount') ?? 0).toLocaleString('en-IN')} off${Number(watch('bundleThreeItemDiscount') ?? 0) > 0 ? ` · Add one more for an extra ₹${Math.max(0, Number(watch('bundleThreeItemDiscount') ?? 0) - Number(watch('bundleTwoItemDiscount') ?? 0)).toLocaleString('en-IN')} off · ₹${Number(watch('bundleThreeItemDiscount') ?? 0).toLocaleString('en-IN')} maximum total saving.` : '.'}`
            : 'Bundle savings are currently off.'}
        </div>
      </section>

      {watch('completeTheFitStrategy') === 'manual' ? <section className="grid gap-5 border border-border bg-background-primary p-4 sm:p-5" aria-labelledby="manual-merchandising-heading">
        <div>
          <h3 id="manual-merchandising-heading" className="font-display text-2xl text-text-primary">Customized products from the website</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Search the live catalogue, add products, then use the arrows to set their exact order in the Bag rail.</p>
        </div>
        <Input label="Search website products" value={merchandisingSearch} placeholder="Search by product name or slug" onChange={(event) => setMerchandisingSearch(event.target.value)} />

        {selectedRecommendedIds.length ? <div className="grid gap-2" aria-label="Selected Complete the Fit products">
          {selectedRecommendedIds.map((id, index) => {
            const selected = productCatalogue.data?.items.find((candidate) => itemId(candidate) === id);
            return <article key={id} className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border border-border bg-background-elevated p-3">
              <div className="aspect-[3/4] overflow-hidden bg-background-primary">{selected?.images?.[0]?.url ? <img src={selected.images[0].url} alt="" className="h-full w-full object-cover" /> : null}</div>
              <div className="min-w-0"><p className="truncate text-sm text-text-primary">{selected?.title ?? id}</p><p className="mt-1 font-mono text-[11px] text-accent-gold">Position {index + 1}{selected ? ` · ₹${selected.basePrice.toLocaleString('en-IN')}` : ''}</p></div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" aria-label={`Move ${selected?.title ?? id} up`} disabled={index === 0} onClick={() => moveRecommendedProduct(index, -1)}><ArrowUp size={15} /></Button>
                <Button type="button" variant="secondary" aria-label={`Move ${selected?.title ?? id} down`} disabled={index === selectedRecommendedIds.length - 1} onClick={() => moveRecommendedProduct(index, 1)}><ArrowDown size={15} /></Button>
                <Button type="button" variant="danger" aria-label={`Remove ${selected?.title ?? id}`} onClick={() => setRecommendedProducts(selectedRecommendedIds.filter((candidate) => candidate !== id))}><Trash2 size={15} /></Button>
              </div>
            </article>;
          })}
        </div> : <p className="border border-dashed border-border p-5 text-sm text-text-muted">No manual products selected yet.</p>}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {selectableRecommendations.map((candidate) => <button key={itemId(candidate)} type="button" onClick={() => setRecommendedProducts([...selectedRecommendedIds, itemId(candidate)])} className="grid min-h-20 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border border-border bg-background-elevated p-3 text-left transition hover:border-accent-gold">
            <span className="aspect-[3/4] overflow-hidden bg-background-primary">{candidate.images?.[0]?.url ? <img src={candidate.images[0].url} alt="" className="h-full w-full object-cover" /> : null}</span>
            <span className="min-w-0"><span className="block truncate text-sm text-text-primary">{candidate.title}</span><span className="mt-1 block font-mono text-[11px] text-accent-gold">₹{candidate.basePrice.toLocaleString('en-IN')}</span></span>
            <Plus size={17} className="text-accent-gold" />
          </button>)}
        </div>
        {productCatalogue.isLoading ? <p className="text-sm text-text-muted">Loading website products…</p> : null}
        {!productCatalogue.isLoading && selectableRecommendations.length === 0 ? <p className="text-sm text-text-muted">No additional matching products.</p> : null}
      </section> : <div className="border border-border bg-background-primary p-5 text-sm leading-6 text-text-secondary">{watch('completeTheFitStrategy') === 'best_sellers' ? 'The rail ranks published products by Bestseller status, lifetime sales, and recency.' : 'The rail learns from valid orders containing this product, then falls back to best sellers when there is not enough order history.'}</div>}
    </AdminFormSection> : null}

    {activeTab === 'shipping' ? <AdminFormSection title="Shipping & Attributes" description="Defaults are 12 × 10 inches (30.48 × 25.4 cm), 2 cm high and 0.2 kg. Replace them with measured packed values whenever needed." columns={3}>
      <Input label="Product weight (kg)" type="number" min={0} step="0.001" error={formState.errors.weight?.message} {...register('weight')} />
      <Input label="Packed length (cm)" type="number" min={0} step="0.1" error={formState.errors.length?.message} {...register('length')} />
      <Input label="Packed breadth (cm)" type="number" min={0} step="0.1" error={formState.errors.width?.message} {...register('width')} />
      <Input label="Packed height (cm)" type="number" min={0} step="0.1" error={formState.errors.height?.message} {...register('height')} />
      <Input label="Packaging weight (kg)" type="number" min={0} max={25} step="0.001" error={formState.errors.packagingWeight?.message} {...register('packagingWeight')} />
      <Input label="Default package preset code" maxLength={80} error={formState.errors.defaultPackagePreset?.message} {...register('defaultPackagePreset')} />
      <Input label="Maximum quantity per package" type="number" min={1} max={1000} step={1} error={formState.errors.maximumQuantityPerPackage?.message} {...register('maximumQuantityPerPackage')} />
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
