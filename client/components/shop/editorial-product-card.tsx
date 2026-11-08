'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {storefrontReveal} from '@/lib/storefront-motion';
import type {ReactNode} from 'react';
import {SafeImage} from '@/components/shared/safe-image';
import {QuickAddSheet} from './quick-add-sheet';
import {formatPrice} from '@/lib/utils';
import {EDITORIAL_COPY as C} from '@/constants/editorial-copy';
import type {Product} from '@/types/product.types';
export interface EditorialProductCardProps {product:Product;priority?:boolean;quickAdd?:boolean;}
export function EditorialProductCard({product,priority=false,quickAdd=true}:EditorialProductCardProps):ReactNode{
 const reduced=useStorefrontReducedMotion();
 const image=product.images[0];const hover=product.hoverImage??product.images[1];
 const available=product.variants.some(v=>v.enabled!==false&&v.stock>0);
 const prices=product.variants.filter(v=>v.enabled!==false).map(v=>v.price).filter(Number.isFinite);const price=prices.length?Math.min(...prices):product.basePrice;
 return <motion.article className="editorial-product-card" variants={storefrontReveal} initial={reduced?false:"initial"} whileInView="animate" viewport={{once:true,amount:0.08}}>
  <div className="editorial-product-media"><Link href={`/product/${product.slug}`} aria-label={product.title}>{image&&<SafeImage src={image.url} alt={image.alt||product.title} fill sizes="(min-width:1024px) 25vw, 50vw" priority={priority} className="editorial-product-image"/>}{hover&&<SafeImage src={hover.url} alt={hover.alt||product.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="editorial-product-hover"/>}</Link>{quickAdd&&available&&<QuickAddSheet product={product}/>}</div>
  <Link className="editorial-product-caption" href={`/product/${product.slug}`}><h3>{product.title}</h3>{product.materialCare&&<p className="editorial-product-material">{product.materialCare.split('\n')[0]}</p>}<p>{formatPrice(price)}{product.comparePrice&&product.comparePrice>price?<del>{formatPrice(product.comparePrice)}</del>:null}</p>{!available&&<p>{C.soldOut}</p>}</Link>
 </motion.article>;
}
