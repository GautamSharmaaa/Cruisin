// Governed by .rules v1.0
'use client';

import type { ReactNode } from 'react';
import { Drawer } from '@/components/shared/drawer';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import type { CategoryDto, CollectionDto } from '@/types/dto.types';

export interface AdvancedFilterValues {
  category: string;
  collection: string;
  gender: string;
  size: string;
  color: string;
  priceMin: string;
  priceMax: string;
  availability: string;
  sale: boolean;
  sort: string;
}

export interface AdvancedFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: AdvancedFilterValues;
  onChange: (values: AdvancedFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
  categories: CategoryDto[];
  collections: CollectionDto[];
  sizes: string[];
  colors: Array<{ label: string; hex: string }>;
}

const sortOptions = [
  ['newest', 'Latest'],
  ['price-asc', 'Price Low to High'],
  ['price-desc', 'Price High to Low'],
  ['best-selling', 'Bestsellers']
] as const;

export function AdvancedFiltersDrawer({ open, onOpenChange, values, onChange, onApply, onClear, categories, collections, sizes, colors }: AdvancedFiltersDrawerProps): ReactNode {
  const patch = (key: keyof AdvancedFilterValues, value: string | boolean): void => onChange({ ...values, [key]: value });
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Advanced Filters">
      <div className="grid gap-5">
        <Select label="Category" value={values.category} onChange={(value) => patch('category', value)}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category._id ?? category.id ?? category.slug} value={category.path ?? category.slug}>{category.name}</option>)}
        </Select>
        <Select label="Collection" value={values.collection} onChange={(value) => patch('collection', value)}>
          <option value="">All collections</option>
          {collections.map((collection) => <option key={collection._id ?? collection.id ?? collection.slug} value={collection.slug}>{collection.title}</option>)}
        </Select>
        <Select label="Gender" value={values.gender} onChange={(value) => patch('gender', value)}>
          <option value="">All</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="unisex">Unisex</option>
        </Select>
        <fieldset className="grid gap-3">
          <legend className="text-[11px] uppercase tracking-[0.14em] text-text-muted">{COPY.product.size}</legend>
          {sizes.length ? <div className="flex flex-wrap gap-2">{sizes.map((size) => <button type="button" key={size.toLowerCase()} aria-pressed={values.size.toLowerCase() === size.toLowerCase()} onClick={() => patch('size', values.size.toLowerCase() === size.toLowerCase() ? '' : size)} className={'h-11 min-w-11 border px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ' + (values.size.toLowerCase() === size.toLowerCase() ? 'border-accent-gold bg-accent-gold/5 text-accent-gold' : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary')}>{size}</button>)}</div> : <p className="text-sm text-text-muted">No published size options are available.</p>}
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-[11px] uppercase tracking-[0.14em] text-text-muted">{COPY.product.color}</legend>
          {colors.length ? <div className="flex flex-wrap gap-2">{colors.map((color) => {
            const selected = values.color.toLowerCase() === color.label.toLowerCase();
            return <button type="button" key={color.label.toLowerCase()} aria-label={`Filter by ${color.label}`} aria-pressed={selected} onClick={() => patch('color', selected ? '' : color.label)} className={'flex min-h-11 items-center border px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold ' + (selected ? 'border-accent-gold bg-accent-gold/5 text-accent-gold' : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary')}><span aria-hidden="true" className="mr-2 h-4 w-4 rounded-full border border-border-strong shadow-inner" style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#777777' }} />{color.label}</button>;
          })}</div> : <p className="text-sm text-text-muted">No published color options are available.</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min price" value={values.priceMin} onChange={(value) => patch('priceMin', value)} />
          <Field label="Max price" value={values.priceMax} onChange={(value) => patch('priceMax', value)} />
        </div>
        <Select label="Availability" value={values.availability} onChange={(value) => patch('availability', value)}>
          <option value="all">All</option>
          <option value="in-stock">In stock</option>
          <option value="out-of-stock">Out of stock</option>
        </Select>
        <label className="flex min-h-11 items-center gap-3 border border-border px-3 text-sm text-text-secondary">
          <input type="checkbox" checked={values.sale} onChange={(event) => patch('sale', event.target.checked)} className="h-4 w-4 accent-accent-gold" />
          Sale only
        </label>
        <Select label={COPY.shop.sort} value={values.sort} onChange={(value) => patch('sort', value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border bg-background-elevated pt-4">
          <Button type="button" variant="secondary" onClick={onClear}>Clear</Button>
          <Button type="button" onClick={onApply}>Apply Filters</Button>
        </div>
      </div>
    </Drawer>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }): ReactNode {
  return <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm normal-case tracking-0 text-text-primary">{children}</select></label>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): ReactNode {
  return <label className="grid gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted"><span>{label}</span><input value={value} type="number" min="0" onChange={(event) => onChange(event.target.value)} className="h-11 border border-border bg-background-input px-3 text-sm normal-case tracking-0 text-text-primary" /></label>;
}
