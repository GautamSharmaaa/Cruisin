// Governed by .rules v1.0
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRODUCT_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useCreateProduct, useUpdateProduct, useUploadSignature } from '@/hooks/useAdminMutations';
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
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? '',
    richDescription: product.richDescription ?? '',
    category: typeof product.category === 'string' ? product.category : '',
    basePrice: product.basePrice,
    comparePrice: product.comparePrice,
    image: image?.url ?? variant?.images?.[0]?.url ?? PRODUCT_FORM_DEFAULTS.image,
    sku: variant?.sku ?? '',
    size: variant?.size ?? '',
    color: variant?.color ?? '',
    colorHex: variant?.colorHex ?? PRODUCT_FORM_DEFAULTS.colorHex,
    stock: variant?.stock ?? 0
  };
};

export function ProductForm({ product }: ProductFormProps): ReactNode {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadSignature = useUploadSignature();
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<ProductFormValues>({ resolver: zodResolver(adminProductSchema), defaultValues: formValuesFromProduct(product) });
  useEffect(() => { reset(formValuesFromProduct(product)); }, [product, reset]);
  const [uploading, setUploading] = useState(false);
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
  const onSubmit = (data: ProductFormValues): void => { if (productId) updateProduct.mutate({ ...data, id: productId }); else createProduct.mutate(data); };
  const isPending = createProduct.isPending || updateProduct.isPending || uploading;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <Input label={COPY.fields.title} error={formState.errors.title?.message} {...register('title', { onBlur: () => setValue('slug', slugify(title ?? '')) })} />
      <Input label={COPY.fields.slug} error={formState.errors.slug?.message} {...register('slug')} />
      <Input label={COPY.fields.description} error={formState.errors.description?.message} {...register('description')} />
      <Input label={COPY.fields.richDescription} error={formState.errors.richDescription?.message} {...register('richDescription')} />
      <Input label={COPY.fields.category} error={formState.errors.category?.message} {...register('category')} />
      <Input label={COPY.fields.image} error={formState.errors.image?.message} {...register('image')} />
      <Input label={COPY.fields.basePrice} type="number" error={formState.errors.basePrice?.message} {...register('basePrice')} />
      <Input label={COPY.fields.comparePrice} type="number" error={formState.errors.comparePrice?.message} {...register('comparePrice')} />

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

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>{isPending ? COPY.products.saving : COPY.products.save}</Button>
      </div>
    </form>
  );
}
