// Governed by .rules v1.0
'use client';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { BANNER_FORM_DEFAULTS } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { useCreateBanner, useReorderBanners } from '@/hooks/useAdminMutations';
import { useAdminBanners } from '@/hooks/useAdminResources';
import { adminBannerSchema } from '@/lib/schemas';
import type { CmsSectionDto } from '@/types/dto.types';

export interface CmsBuilderProps { }

interface BannerRowProps {
  banner: CmsSectionDto;
}

type BannerFormValues = z.infer<typeof adminBannerSchema>;

const bannerId = (banner: CmsSectionDto): string => banner.id ?? banner._id ?? banner.title;
const today = (): string => new Date().toISOString().slice(0, 10);
const nextMonth = (): string => { const date = new Date(); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 10); };

function BannerRow({ banner }: BannerRowProps): ReactNode {
  const id = bannerId(banner);
  const draggable = useDraggable({ id });
  const droppable = useDroppable({ id });
  return <button ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} {...draggable.listeners} {...draggable.attributes} className="min-h-20 cursor-grab border border-border bg-background-primary p-4 text-left transition hover:border-border-strong hover:bg-background-overlay active:cursor-grabbing"><span className="block font-display text-lg text-text-primary">{banner.title}</span><span className="mt-2 flex flex-wrap items-center gap-2"><StatusPill tone={banner.isActive ? 'success' : 'neutral'}>{banner.isActive ? COPY.table.active : COPY.table.inactive}</StatusPill><StatusPill tone="gold">{banner.position}</StatusPill></span></button>;
}

export function CmsBuilder(_props: CmsBuilderProps): ReactNode {
  const banners = useAdminBanners();
  const createBanner = useCreateBanner();
  const reorderBanners = useReorderBanners();
  const { register, handleSubmit, formState, reset, setValue, watch } = useForm<BannerFormValues>({ resolver: zodResolver(adminBannerSchema), defaultValues: { ...BANNER_FORM_DEFAULTS, startDate: today(), endDate: nextMonth() } });
  const bannerList = banners.data ?? [];
  const activePreview = bannerList[0];
  const onSubmit = (data: BannerFormValues): void => { createBanner.mutate(data, { onSuccess: () => reset({ ...BANNER_FORM_DEFAULTS, startDate: today(), endDate: nextMonth() }) }); };
  const onDragEnd = (event: DragEndEvent): void => {
    if (!event.over || event.active.id === event.over.id) return;
    const ids = bannerList.map(bannerId);
    const activeIndex = ids.indexOf(String(event.active.id));
    const overIndex = ids.indexOf(String(event.over.id));
    if (activeIndex < 0 || overIndex < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(activeIndex, 1);
    if (!moved) return;
    nextIds.splice(overIndex, 0, moved);
    reorderBanners.mutate(nextIds);
  };
  return <DndContext onDragEnd={onDragEnd}><div className="grid gap-6 lg:grid-cols-[1fr_420px]"><section className="grid gap-6"><form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 border border-border bg-background-elevated p-6 shadow-lg md:grid-cols-2"><h1 className="font-display text-2xl md:col-span-2">{COPY.cms.form}</h1><Input label={COPY.fields.title} error={formState.errors.title?.message} {...register('title')} /><Input label={COPY.fields.subtitle} error={formState.errors.subtitle?.message} {...register('subtitle')} /><Input label={COPY.fields.ctaText} error={formState.errors.ctaText?.message} {...register('ctaText')} /><Input label={COPY.fields.ctaLink} error={formState.errors.ctaLink?.message} {...register('ctaLink')} /><Input label={COPY.fields.image} error={formState.errors.image?.message} {...register('image')} /><Input label={COPY.fields.mobileImage} error={formState.errors.mobileImage?.message} {...register('mobileImage')} /><Input label={COPY.fields.position} error={formState.errors.position?.message} {...register('position')} /><Input label={COPY.fields.sortOrder} type="number" error={formState.errors.sortOrder?.message} {...register('sortOrder')} /><Input label={COPY.fields.startDate} type="date" error={formState.errors.startDate?.message} {...register('startDate')} /><Input label={COPY.fields.endDate} type="date" error={formState.errors.endDate?.message} {...register('endDate')} /><SelectField label={COPY.fields.active} options={[{ label: COPY.common.yes, value: 'true' }, { label: COPY.common.no, value: 'false' }]} value={watch('isActive') ? 'true' : 'false'} onChange={(event) => setValue('isActive', event.target.value === 'true')} /><Button type="submit" disabled={createBanner.isPending}>{createBanner.isPending ? COPY.common.loading : COPY.common.save}</Button>{createBanner.isSuccess ? <p className="text-sm text-success md:col-span-2">{COPY.cms.created}</p> : null}{createBanner.error ? <p className="text-sm text-danger md:col-span-2">{createBanner.error.message}</p> : null}</form><div className="border border-border bg-background-elevated p-6 shadow-lg"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl">{COPY.cms.reorder}</h2>{reorderBanners.isSuccess ? <StatusPill tone="success">{COPY.common.success}</StatusPill> : null}</div><div className="mt-6 grid gap-3">{banners.isLoading ? <p className="text-sm text-text-secondary">{COPY.common.loading}</p> : bannerList.length > 0 ? bannerList.map((banner) => <BannerRow key={bannerId(banner)} banner={banner} />) : <EmptyPanel title={COPY.cms.title} message={COPY.cms.empty} />}</div></div></section><aside className="border border-border bg-background-elevated p-6 shadow-lg"><h2 className="font-display text-xl">{COPY.cms.preview}</h2><div className="mt-6 aspect-[3/4] overflow-hidden border border-border bg-background-primary">{activePreview ? <div className="relative flex h-full flex-col justify-end bg-background-overlay p-6"><div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,var(--accent-gold-dim),transparent)] opacity-20" /><p className="relative text-xs uppercase tracking-[0.15em] text-accent-gold">{activePreview.position}</p><h3 className="relative mt-3 font-display text-3xl text-text-primary">{activePreview.title}</h3><p className="relative mt-3 text-sm text-text-secondary">{activePreview.subtitle}</p><p className="relative mt-6 text-xs uppercase tracking-[0.15em] text-text-primary">{activePreview.cta?.text}</p></div> : <div className="p-6"><p className="text-sm text-text-secondary">{COPY.cms.empty}</p></div>}</div></aside></div></DndContext>;
}
