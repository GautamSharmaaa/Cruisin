'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {useState,useRef,type ReactNode} from 'react';
import {Plus,X} from 'lucide-react';
import Link from 'next/link';
import {SafeImage} from '@/components/shared/safe-image';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import {formatPrice} from '@/lib/utils';
import {addProductToCart} from '@/lib/meta-actions';
import {useCartStore} from '@/store/cartStore';
import type {Product} from '@/types/product.types';
export interface QuickAddSheetProps {product:Product;}
export function QuickAddSheet({product}:QuickAddSheetProps):ReactNode{
 const [open,setOpen]=useState(false);const [selected,setSelected]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const pending=useRef(false);
 const addItem=useCartStore(s=>s.addItem);const closeCart=useCartStore(s=>s.closeCart);
 const variant=product.variants.find(v=>v.id===selected);
 const image=variant?.images[0]??product.images[0];
 const submit=():void=>{
  if(pending.current||!variant)return;
  pending.current=true;setBusy(true);setError('');
  if(addProductToCart({product,variant,quantity:1,addItem})){setOpen(false);}else{closeCart();setError(C.unavailable);}
  // Keep the guard until the next user interaction after this event finishes.
  window.setTimeout(()=>{pending.current=false;setBusy(false);},400);
 };
 return <Dialog.Root open={open} onOpenChange={v=>{setOpen(v);if(v){setSelected('');setError('');}}}>
  <Dialog.Trigger asChild><button type="button" className="editorial-quick-trigger" aria-label={`${C.quickAdd}: ${product.title}`}><Plus size={18}/></button></Dialog.Trigger>
  <Dialog.Portal><Dialog.Overlay className="editorial-sheet-overlay"/><Dialog.Content className="editorial-quick-sheet">
   <Dialog.Title className="editorial-quick-title">{product.title}</Dialog.Title><Dialog.Description className="editorial-quick-price">{formatPrice(variant?.price??product.basePrice)}</Dialog.Description>
   <Dialog.Close asChild><button type="button" aria-label={C.close} className="editorial-quick-close"><X size={18}/></button></Dialog.Close>
   <div className="editorial-quick-body">{image&&<div className="editorial-quick-image"><SafeImage src={image.url} alt={image.alt||product.title} fill sizes="(min-width:768px) 200px, 120px" className="object-cover"/></div>}
    <div><fieldset><legend>{C.chooseVariant}</legend><div className="editorial-variant-options">{product.variants.filter(v=>v.enabled!==false).map(v=><button key={v.id} type="button" aria-pressed={selected===v.id} disabled={v.stock<=0} onClick={()=>setSelected(v.id)}>{v.size} · {v.color}{v.stock<=0?` · ${C.soldOut}`:''}</button>)}</div></fieldset>
    {product.shortDescription&&<p className="editorial-quick-description">{product.shortDescription}</p>}
    <Link href={`/product/${product.slug}`} className="editorial-text-link">{C.viewProduct}</Link></div>
   </div>
   {error&&<p role="alert">{error}</p>}
   <button type="button" className="editorial-add-button" disabled={!variant||variant.stock<=0||busy} onClick={submit}>{busy?C.adding:C.addToBag}</button>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
