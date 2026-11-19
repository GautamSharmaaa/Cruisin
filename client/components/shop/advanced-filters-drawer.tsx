'use client';
import type { CollectionFilterGroup } from '@cruisin/contracts/storefront-experience';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {useState,type ReactNode,type RefObject} from 'react';
import {z} from 'zod';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
import type {CategoryDto,CollectionDto} from '@/types/dto.types';
export interface AdvancedFilterValues {category:string;collection:string;gender:string;size:string;color:string;priceMin:string;priceMax:string;availability:string;sale:boolean;sort:string;}
export interface AdvancedFiltersDrawerProps {open:boolean;onOpenChange:(open:boolean)=>void;values:AdvancedFilterValues;onChange:(values:AdvancedFilterValues)=>void;onApply:()=>void;onClear:()=>void;groups:readonly CollectionFilterGroup[];categories:CategoryDto[];collections:CollectionDto[];sizes:string[];colors:{label:string;hex:string}[];resultCount?:number;countLoading?:boolean;triggerRef?:RefObject<HTMLButtonElement|null>;}
const priceSchema=z.object({priceMin:z.string().refine(v=>v===''||/^\d+(\.\d{0,2})?$/.test(v),C.invalidPrice),priceMax:z.string().refine(v=>v===''||/^\d+(\.\d{0,2})?$/.test(v),C.invalidPrice)}).refine(v=>!v.priceMin||!v.priceMax||Number(v.priceMin)<=Number(v.priceMax),{message:'Minimum price must not exceed maximum price.'});
export function AdvancedFiltersDrawer({open,onOpenChange,values,onChange,onApply,onClear,groups,categories,collections,sizes,colors,resultCount,countLoading,triggerRef}:AdvancedFiltersDrawerProps):ReactNode{
 const [error,setError]=useState('');const patch=(key:keyof AdvancedFilterValues,value:string|boolean):void=>{setError('');onChange({...values,[key]:value});};
 return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="storefront-drawer-overlay collection-filter-overlay"/><Dialog.Content onCloseAutoFocus={event=>{event.preventDefault();triggerRef?.current?.focus({preventScroll:true});}} asChild><aside className="storefront-drawer-panel collection-filter-panel"><header><Dialog.Title>{C.filters}</Dialog.Title><Dialog.Close aria-label="Close filters"><X size={22} strokeWidth={1.3}/></Dialog.Close><Dialog.Description className="sr-only">{C.filterHelp}</Dialog.Description></header><div className="collection-filter-scroll">
 {groups.includes('size') && <FilterGroup title={C.size}>{sizes.map(size=><CheckOption key={size} label={size} checked={values.size.toLowerCase()===size.toLowerCase()} onChange={()=>patch('size',values.size===size?'':size)}/>)}</FilterGroup>}
 {groups.includes('availability') && <FilterGroup title={C.availability}>{[['in-stock',C.inStock],['out-of-stock',C.outOfStock]].map(([key,label])=><CheckOption key={key} label={label} checked={values.availability===key} onChange={()=>patch('availability',values.availability===key?'all':key)}/>)}</FilterGroup>}
 {groups.includes('price') && <FilterGroup title={C.price}><div className="collection-price-track"><input aria-label={C.max} type="range" min="0" max="55000" step="100" value={Math.min(55000,Number(values.priceMax||55000))} onChange={e=>patch('priceMax',e.target.value)}/></div><div className="collection-price-inputs"><label>₹<input aria-label={C.min} inputMode="decimal" value={values.priceMin} placeholder="0" onChange={e=>patch('priceMin',e.target.value)}/></label><span>–</span><label>₹<input aria-label={C.max} inputMode="decimal" value={values.priceMax} placeholder="Any" onChange={e=>patch('priceMax',e.target.value)}/></label></div></FilterGroup>}
 {groups.includes('type') && <FilterGroup title={C.type}>{categories.filter(category=>category.showInFilters!==false).map(category=><CheckOption key={category._id??category.slug} label={category.name} checked={values.category===(category.path??category.slug)} onChange={()=>patch('category',values.category===(category.path??category.slug)?'':category.path??category.slug)}/>)}</FilterGroup>}
 {groups.includes('color') && <FilterGroup title={C.color}>{colors.map(color=><CheckOption key={color.label} label={color.label} swatch={color.hex} checked={values.color===color.label} onChange={()=>patch('color',values.color===color.label?'':color.label)}/>)}</FilterGroup>}
 {groups.includes('collection') && collections.length>0&&<FilterGroup title={C.collection}>{collections.map(collection=><CheckOption key={collection._id??collection.slug} label={collection.title} checked={values.collection===collection.slug} onChange={()=>patch('collection',values.collection===collection.slug?'':collection.slug)}/>)}</FilterGroup>}
 {groups.includes('gender') && <FilterGroup title={C.gender}>{['men','women','unisex'].map(gender=><CheckOption key={gender} label={gender} checked={values.gender===gender} onChange={()=>patch('gender',values.gender===gender?'':gender)}/>)}</FilterGroup>}{groups.includes('sale') && <CheckOption label={C.sale} checked={values.sale} onChange={()=>patch('sale',!values.sale)}/>}
 </div><footer>{error&&<p role="alert">{error}</p>}<button type="button" className="collection-filter-clear" onClick={()=>{setError('');onClear();}}>{C.clear}</button><button type="button" className="collection-filter-apply" onClick={()=>{const parsed=priceSchema.safeParse(values);if(!parsed.success){setError(parsed.error.issues[0]?.message??C.invalidPrice);return;}setError('');onApply();}}>{countLoading?C.updating:resultCount===undefined?C.apply:C.viewItems.replace('{count}',String(resultCount))}</button></footer></aside></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export interface FilterGroupProps {title:string;children:ReactNode;}
function FilterGroup({title,children}:FilterGroupProps):ReactNode{return <details className="collection-filter-group"><summary>{title}<span aria-hidden="true"/></summary><div>{children}</div></details>;}
export interface CheckOptionProps {label:string;checked:boolean;onChange:()=>void;swatch?:string;}
function CheckOption({ label, checked, onChange, swatch }: CheckOptionProps): ReactNode {
  const color = swatch && /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(swatch.trim()) ? swatch.trim() : undefined;
  return <label className="collection-filter-check">
    <input type="checkbox" checked={checked} onChange={onChange} />
    {color && <span className="collection-filter-swatch" aria-hidden="true" style={{ backgroundColor: color }} />}
    <span>{label}</span>
  </label>;
}
