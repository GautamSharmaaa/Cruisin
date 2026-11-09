'use client';
import { useState, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { readOrbitContent, type OrbitCard } from '@cruisin/contracts/orbit-cards';
import { Input } from '@/components/ui/input';
import { MediaControl } from './campaign-content-fields';
import { ORBIT_COPY as C } from '@/constants/orbit-copy';

export interface OrbitContentFieldsProps {
  content: Record<string, unknown>;
  onChange: (key: string, value: string | number | boolean) => void;
}

function readEditableCards(value: unknown): OrbitCard[] {
  try {
    const rows: unknown = JSON.parse(String(value ?? '[]'));
    if (Array.isArray(rows)) return rows.filter((row): row is OrbitCard =>
      Boolean(row && typeof row.label === 'string' && typeof row.image === 'string' && typeof row.href === 'string'));
  } catch { return []; }
  return [];
}

export function OrbitContentFields({ content, onChange }: OrbitContentFieldsProps): ReactNode {
  const cards = readEditableCards(content.cards);
  const [drag, setDrag] = useState<number | null>(null);
  const save = (next: OrbitCard[]): void => onChange('cards', JSON.stringify(next));
  const update = (index: number, key: keyof OrbitCard, value: string): void => {
    save(cards.map((card, position) => position === index ? { ...card, [key]: value } : card));
  };
  const move = (from: number, to: number): void => {
    if (to < 0 || to >= cards.length || from === to) return;
    const next = [...cards];
    const [card] = next.splice(from, 1);
    next.splice(to, 0, card);
    save(next);
  };

  return <fieldset className="grid gap-4 border border-border p-4" aria-label={C.name}>
    <legend>{C.name}</legend>
    <p className="text-sm text-text-secondary">{C.helper}</p>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={content.autoplay !== false} onChange={event => onChange('autoplay', event.target.checked)} />{C.autoplay}</label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={content.mouseControl !== false} onChange={event => onChange('mouseControl', event.target.checked)} />{C.mouse}</label>
    <Input label={C.speed} type="number" min={16} max={120} value={Number(content.cycleSeconds ?? 48)} onChange={event => onChange('cycleSeconds', Number(event.target.value))} />
    <div className="grid gap-4">{cards.map((card, index) => <fieldset className="grid gap-3 border border-border p-3" key={index}
      onDragOver={event => { if (drag !== null) event.preventDefault(); }}
      onDrop={event => { event.preventDefault(); if (drag !== null) move(drag, index); setDrag(null); }}>
      <legend draggable className="flex cursor-grab items-center gap-1" onDragStart={event => { event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; setDrag(index); }} onDragEnd={() => setDrag(null)}><GripVertical size={14} aria-hidden="true" />{C.card} {index + 1}</legend>
      <Input label={`${C.card} ${index + 1} ${C.label}`} value={card.label} onChange={event => update(index, 'label', event.target.value)} />
      <MediaControl label={`${C.card} ${index + 1} ${C.image}`} url={card.image} onChange={url => update(index, 'image', url)} />
      <Input label={`${C.card} ${index + 1} ${C.href}`} value={card.href} onChange={event => update(index, 'href', event.target.value)} />
      <div className="flex gap-2">
        <button type="button" className="cms-studio-text-action" aria-label={`${C.up} ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={16} /></button>
        <button type="button" className="cms-studio-text-action" aria-label={`${C.down} ${index + 1}`} disabled={index === cards.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={16} /></button>
        <button type="button" className="cms-studio-text-action" aria-label={`${C.remove} ${index + 1}`} disabled={cards.length <= 3} onClick={() => save(cards.filter((_, position) => position !== index))}><Trash2 size={16} /></button>
      </div>
    </fieldset>)}</div>
    <button type="button" className="cms-studio-text-action" disabled={cards.length >= 12} onClick={() => save([...cards, { label: C.newCard, image: '/images/department/men-studio.jpg', href: '/shop' }])}><Plus size={16} />{C.add}</button>
    {!readOrbitContent(content) && <p role="alert">{C.invalid}</p>}
  </fieldset>;
}
