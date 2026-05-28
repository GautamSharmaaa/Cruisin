// Governed by .rules v1.0
'use client';
import { useDropzone } from 'react-dropzone';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
export interface ProductFormProps { }
export function ProductForm(_props: ProductFormProps): ReactNode { const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept: { 'image/*': [] }, maxFiles: 8 }); return <form className="grid gap-6"><Input label={COPY.fields.title} /><Input label={COPY.fields.slug} /><Input label={COPY.fields.basePrice} type="number" /><div {...getRootProps()} className={'min-h-40 border border-dashed p-8 text-center text-text-secondary ' + (isDragActive ? 'border-accent-gold' : 'border-border')}><input {...getInputProps()} /><p>{COPY.products.uploader}</p></div><section className="border border-border p-4"><h2 className="font-display text-xl">{COPY.products.variants}</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><Input label={COPY.fields.sku} /><Input label={COPY.fields.size} /><Input label={COPY.fields.color} /><Input label={COPY.fields.stock} type="number" /></div></section><Button type="button">{COPY.common.save}</Button></form>; }
