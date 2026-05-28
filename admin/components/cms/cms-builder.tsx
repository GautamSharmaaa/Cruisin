// Governed by .rules v1.0
'use client';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
export interface CmsBuilderProps { }
export function CmsBuilder(_props: CmsBuilderProps): ReactNode { const onDragEnd = (_event: DragEndEvent): void => {}; return <DndContext onDragEnd={onDragEnd}><div className="grid gap-6 lg:grid-cols-[1fr_420px]"><section className="border border-border bg-background-elevated p-6"><h1 className="font-display text-2xl">{COPY.cms.title}</h1><div className="mt-6 grid gap-3">{COPY.cms.sections.map((section) => <button key={section} className="min-h-14 border border-border p-4 text-left">{section}</button>)}</div></section><aside className="border border-border bg-background-elevated p-6"><h2 className="font-display text-xl">{COPY.cms.preview}</h2><div className="mt-6 aspect-[3/4] border border-border bg-background-primary" /></aside></div></DndContext>; }
