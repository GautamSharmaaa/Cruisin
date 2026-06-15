// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { CATEGORY_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useArchiveCategory, useCreateCategory } from '@/hooks/useAdminMutations';
import { adminCategorySchema } from '@/lib/schemas';
import { slugify } from '@/lib/utils';
import type { CategoryDto } from '@/types/dto.types';

export interface CategoryManagerProps {
  categories: CategoryDto[];
  isLoading: boolean;
}

type CategoryFormValues = z.infer<typeof adminCategorySchema>;

const categoryId = (category: CategoryDto): string => category.id ?? category._id ?? category.slug;

export function CategoryManager({ categories, isLoading }: CategoryManagerProps): ReactNode {
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<CategoryFormValues>({ resolver: zodResolver(adminCategorySchema), defaultValues: CATEGORY_FORM_DEFAULTS });
  const name = watch('name');
  const onSubmit = (data: CategoryFormValues): void => { createCategory.mutate(data, { onSuccess: () => reset(CATEGORY_FORM_DEFAULTS) }); };
  const onArchive = (id: string): void => { if (window.confirm(COPY.common.confirmArchive)) archiveCategory.mutate(id); };
  return <section className="grid gap-6"><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6 shadow-lg md:grid-cols-2"><h1 className="font-display text-2xl md:col-span-2">{COPY.categories.form}</h1><Input label={COPY.fields.name} error={formState.errors.name?.message} {...register('name', { onBlur: () => setValue('slug', slugify(name ?? '')) })} /><Input label={COPY.fields.slug} error={formState.errors.slug?.message} {...register('slug')} /><Input label={COPY.fields.image} error={formState.errors.image?.message} {...register('image')} /><Input label={COPY.fields.sortOrder} type="number" error={formState.errors.sortOrder?.message} {...register('sortOrder')} /><SelectField label={COPY.fields.active} options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isActive') ? 'true' : 'false'} onChange={(event) => setValue('isActive', event.target.value === 'true')} /><Button type="submit" disabled={createCategory.isPending}>{createCategory.isPending ? COPY.common.loading : COPY.common.save}</Button>{createCategory.isSuccess ? <p className="text-sm text-success md:col-span-2">{COPY.categories.created}</p> : null}</form>{!isLoading && categories.length === 0 ? <EmptyPanel title={COPY.categories.title} message={COPY.categories.empty} /> : <div className="overflow-x-auto border border-border bg-background-elevated shadow-lg"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-text-secondary"><tr><th className="border-b border-border p-4">{COPY.fields.name}</th><th className="border-b border-border p-4">{COPY.fields.slug}</th><th className="border-b border-border p-4">{COPY.fields.sortOrder}</th><th className="border-b border-border p-4">{COPY.fields.status}</th><th className="border-b border-border p-4">{COPY.table.columns[3]}</th></tr></thead><tbody>{isLoading ? <tr><td className="p-4 text-text-secondary" colSpan={5}>{COPY.common.loading}</td></tr> : categories.map((category) => <tr key={categoryId(category)} className="border-b border-border-subtle transition hover:bg-background-overlay/60"><td className="p-4 text-text-primary">{category.name}</td><td className="p-4 text-text-secondary">{category.slug}</td><td className="p-4 text-text-secondary">{category.sortOrder}</td><td className="p-4"><StatusPill tone={category.isActive ? 'success' : 'neutral'}>{category.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill></td><td className="p-4"><Button variant="danger" onClick={() => onArchive(categoryId(category))}>{COPY.common.archive}</Button></td></tr>)}</tbody></table></div>}</section>;
}
