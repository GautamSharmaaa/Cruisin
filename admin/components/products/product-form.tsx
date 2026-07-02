// Governed by .rules v1.0
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { PRODUCT_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useCreateProduct, useUpdateProduct, useUploadSignature } from '@/hooks/useAdminMutations';
import { useAdminCategories, useAdminCollections } from '@/hooks/useAdminResources';
import { externalUploadApi } from '@/lib/api';
import { adminProductSchema } from '@/lib/schemas';
import { slugify } from '@/lib/utils';
import type { ProductDto } from '@/types/dto.types';

export interface ProductFormProps {
  product?: ProductDto;
}

type ProductFormValues = z.infer<typeof adminProductSchema>;
interface CloudinaryUploadResponse { secure_url?: string; }

const formValuesFromProduct = (product: ProductDto | undefined): Partial<ProductFormValues> => {
  if (!product) return PRODUCT_FORM_DEFAULTS;
  const [image] = product.images ?? [];
  const [variant] = product.variants ?? [];
  const categoryId = typeof product.category === 'string' ? product.category : product.category?._id ?? product.category?.id ?? '';
  const categoryIds = (product.categoryIds ?? []).map((category) => typeof category === 'string' ? category : category._id ?? category.id ?? '').filter(Boolean).join(', ');
  const collections = (product.collections ?? []).map((collection) => typeof collection === 'string' ? collection : collection._id ?? collection.id ?? '').filter(Boolean).join(', ');
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? '',
    shortDescription: product.shortDescription ?? '',
    richDescription: product.richDescription ?? '',
    category: categoryId,
    categoryIds,
    collections,
    tags: (product as ProductDto & { tags?: string[] }).tags?.join(', ') ?? '',
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
    productHighlights: (product.productHighlights ?? []).join(', '),
    basePrice: product.basePrice,
    comparePrice: product.comparePrice,
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
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<ProductFormValues>({ resolver: zodResolver(adminProductSchema), defaultValues: formValuesFromProduct(product) });
  useEffect(() => { reset(formValuesFromProduct(product)); }, [product, reset]);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const onDropHandler = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(COPY.products.uploadFailed, err);
    } finally {
      setUploading(false);
    }
  }, [uploadSignature, setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: { 'image/*': [] }, maxFiles: 8, onDrop: onDropHandler });
  const title = watch('title');
  const imagePreview = watch('image');
  const productId = product?.id ?? product?._id;
  const onSubmit = (data: ProductFormValues): void => {
    setFeedback(null);
    if (productId) {
      updateProduct.mutate(
        { ...data, id: productId },
        {
          onSuccess: () => setFeedback({ type: 'success', message: COPY.products.updated }),
          onError: (error) => setFeedback({ type: 'error', message: error.message })
        }
      );
      return;
    }
    createProduct.mutate(data, {
      onSuccess: () => router.push('/products'),
      onError: (error) => setFeedback({ type: 'error', message: error.message })
    });
  };
  const isPending = createProduct.isPending || updateProduct.isPending || uploading;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <Input label={COPY.fields.title} error={formState.errors.title?.message} {...register('title', { onBlur: () => setValue('slug', slugify(title ?? '')) })} />
      <Input label={COPY.fields.slug} error={formState.errors.slug?.message} {...register('slug')} />
      <Input label={COPY.fields.description} error={formState.errors.description?.message} {...register('description')} />
      <Input label="Short Description" error={formState.errors.shortDescription?.message} {...register('shortDescription')} />
      <Input label={COPY.fields.richDescription} error={formState.errors.richDescription?.message} {...register('richDescription')} />
      <SelectField label={COPY.fields.category} options={[{ label: 'Select category', value: '' }, ...(categories.data ?? []).map((category) => ({ label: category.name, value: category._id ?? category.id ?? category.slug }))]} value={watch('category')} onChange={(event) => setValue('category', event.target.value)} />
      {formState.errors.category?.message ? <p className="text-sm text-danger">{formState.errors.category.message}</p> : null}
      <Input label="Additional Category IDs" error={formState.errors.categoryIds?.message} {...register('categoryIds')} />
      <Input label="Collection IDs" error={formState.errors.collections?.message} list="collection-options" {...register('collections')} />
      <datalist id="collection-options">{(collections.data ?? []).map((collection) => <option key={collection._id ?? collection.id ?? collection.slug} value={collection._id ?? collection.id ?? ''}>{collection.title}</option>)}</datalist>
      <Input label="Tags" error={formState.errors.tags?.message} {...register('tags')} />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField label="Gender" options={[{ label: 'Unisex', value: 'unisex' }, { label: 'Men', value: 'men' }, { label: 'Women', value: 'women' }]} value={watch('gender')} onChange={(event) => setValue('gender', event.target.value as ProductFormValues['gender'])} />
        <SelectField label="Status" options={[{ label: 'Published', value: 'published' }, { label: 'Draft', value: 'draft' }, { label: 'Archived', value: 'archived' }]} value={watch('status')} onChange={(event) => setValue('status', event.target.value as ProductFormValues['status'])} />
        <SelectField label="Visibility" options={[{ label: 'Visible', value: 'visible' }, { label: 'Hidden', value: 'hidden' }]} value={watch('visibility')} onChange={(event) => setValue('visibility', event.target.value as ProductFormValues['visibility'])} />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Toggle label="Sale" value={watch('isSale')} onChange={(value) => setValue('isSale', value)} />
        <Toggle label="Featured" value={watch('isFeatured')} onChange={(value) => setValue('isFeatured', value)} />
        <Toggle label="Bestseller" value={watch('isBestseller')} onChange={(value) => setValue('isBestseller', value)} />
        <Toggle label="New Arrival" value={watch('isNewArrival')} onChange={(value) => setValue('isNewArrival', value)} />
        <Toggle label="Latest Drop" value={watch('isLatestDrop')} onChange={(value) => setValue('isLatestDrop', value)} />
      </div>
      <Input label={COPY.fields.image} error={formState.errors.image?.message} {...register('image')} />
      <Input label="Hover Image" error={formState.errors.hoverImage?.message} {...register('hoverImage')} />
      <Input label="Product Video" error={formState.errors.videoUrl?.message} {...register('videoUrl')} />
      <Input label="Mobile Product Video" error={formState.errors.mobileVideoUrl?.message} {...register('mobileVideoUrl')} />
      <Input label="Video Poster Image" error={formState.errors.videoPosterImage?.message} {...register('videoPosterImage')} />
      <Input label="Image Alt Text" error={formState.errors.imageAltText?.message} {...register('imageAltText')} />
      <Input label={COPY.fields.basePrice} type="number" error={formState.errors.basePrice?.message} {...register('basePrice')} />
      <Input label={COPY.fields.comparePrice} type="number" error={formState.errors.comparePrice?.message} {...register('comparePrice')} />
      <Input label="Material & Care" error={formState.errors.materialCare?.message} {...register('materialCare')} />
      <Input label="Fit Details" error={formState.errors.fitDetails?.message} {...register('fitDetails')} />
      <Input label="Shipping & Returns" error={formState.errors.shippingReturns?.message} {...register('shippingReturns')} />
      <Input label="Size Guide" error={formState.errors.sizeGuide?.message} {...register('sizeGuide')} />
      <Input label="Product Highlights" error={formState.errors.productHighlights?.message} {...register('productHighlights')} />

      <div {...getRootProps()} className={'min-h-40 border border-dashed p-8 text-center text-text-secondary ' + (isDragActive ? 'border-accent-gold' : 'border-border')}>
        <input {...getInputProps()} />
        <p>{uploadSignature.isSuccess ? COPY.products.signed : COPY.products.uploader}</p>
        {uploading ? <p className="mt-2 text-sm">{COPY.products.uploading}</p> : null}
      </div>

      {imagePreview ? (
        <div className="mt-2">
          <img src={String(imagePreview)} alt={COPY.products.previewAlt} className="max-h-40 object-contain" />
        </div>
      ) : null}

      <section className="border border-border p-4">
        <h2 className="font-display text-xl">{COPY.products.variants}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <Input label={COPY.fields.sku} error={formState.errors.sku?.message} {...register('sku')} />
          <Input label={COPY.fields.size} error={formState.errors.size?.message} {...register('size')} />
          <Input label={COPY.fields.color} error={formState.errors.color?.message} {...register('color')} />
          <Input label={COPY.fields.colorHex} error={formState.errors.colorHex?.message} {...register('colorHex')} />
          <Input label={COPY.fields.stock} type="number" error={formState.errors.stock?.message} {...register('stock')} />
        </div>
      </section>

      {feedback ? (
        <p className={feedback.type === 'error' ? 'text-sm text-danger' : 'text-sm text-success'} aria-live="polite">
          {feedback.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>{isPending ? COPY.products.saving : COPY.products.save}</Button>
      </div>
    </form>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactNode {
  return <label className="flex min-h-11 items-center gap-3 border border-border px-3 text-sm text-text-secondary"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent-gold" />{label}</label>;
}
