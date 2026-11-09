'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import Link from 'next/link';
import {useState} from 'react';
import {useStorefrontExperience} from '@/hooks/useStorefrontExperience';
import {motion} from 'framer-motion';
import {storefrontReveal} from '@/lib/storefront-motion';
import type {ReactNode} from 'react';
import {WishlistButton} from '@/components/product/wishlist-button';
import {ProductCardGallery} from './product-card-gallery';
import {QuickAddSheet} from './quick-add-sheet';
import {formatPrice} from '@/lib/utils';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import type {Product} from '@/types/product.types';
export interface EditorialProductCardProps {product:Product;priority?:boolean;quickAdd?:boolean;}
export function EditorialProductCard({product,priority=false,quickAdd=true}:EditorialProductCardProps):ReactNode{
 const experience=useStorefrontExperience();const reduced=useStorefrontReducedMotion()||!experience.pageTransitionsEnabled;
 const [color,setColor]=useState<string|null>(null);
 const colors=product.variants.filter((variant,index,all)=>variant.enabled!==false&&all.findIndex(item=>item.colorHex===variant.colorHex)===index);
 const selected=colors.find(variant=>variant.colorHex===color)??colors[0];
 const galleryProduct=color&&selected?.images.length?{...product,images:selected.images,hoverImage:null}:product;
 const available=product.variants.some(v=>v.enabled!==false&&v.stock>0);
 const prices=product.variants.filter(v=>v.enabled!==false).map(v=>v.price).filter(Number.isFinite);const price=prices.length?Math.min(...prices):product.basePrice;
 return <motion.article className="editorial-product-card" data-entrance={experience.pageTransitionsEnabled} variants={storefrontReveal} initial={reduced?false:"initial"} whileInView="animate" viewport={{once:true,amount:0.08}}>
  <div className="editorial-product-media"><ProductCardGallery product={galleryProduct} priority={priority}/><WishlistButton product={product} next={'/product/'+product.slug} compact/>{quickAdd&&available&&<QuickAddSheet product={product}/>}</div>
  <div className="editorial-product-caption"><Link href={`/product/${product.slug}`}><h3>{product.title}</h3><p>{formatPrice(selected?.price??price)}{product.comparePrice&&product.comparePrice>price?<del>{formatPrice(product.comparePrice)}</del>:null}</p>{!available&&<p>{C.soldOut}</p>}</Link>{colors.length>0&&<div className="editorial-color-swatches" aria-label={C.availableColors}>{colors.map(variant=><button key={variant.colorHex} type="button" aria-label={variant.color} aria-pressed={selected?.colorHex===variant.colorHex} onClick={()=>setColor(variant.colorHex)} style={{'--swatch-color':variant.colorHex} as import('react').CSSProperties}/>)}</div>}</div>
 </motion.article>;
}
