'use client';
import {useState,type ReactNode} from 'react';
import {Clock3,Minus,Plus,Share2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ImageGallery} from './image-gallery';
import {SizeGuideModal} from './size-guide-modal';
import {VariantSelector} from './variant-selector';
import {WishlistButton} from './wishlist-button';
import {ReviewSection} from './review-section';
import {AddToCartButton} from './add-to-cart-button';
import {COPY} from '@/constants/copy';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
import {ROUTES} from '@/constants/routes';
import {normalizeProductHighlights,parseProductDescription} from '@/lib/product-description';
import {addProductToCart} from '@/lib/meta-actions';
import {formatPrice} from '@/lib/utils';
import {useCartStore} from '@/store/cartStore';
import type {Product,ProductVariant} from '@/types/product.types';
export interface ProductDetailProps {product:Product;}
export function ProductDetail({product}:ProductDetailProps):ReactNode{
 const [variant,setVariant]=useState<ProductVariant|null>(null);const [colorVariant,setColorVariant]=useState<ProductVariant|null>(product.variants.find(item=>item.enabled!==false&&item.stock>0)??product.variants[0]??null);const [quantity,setQuantity]=useState(1);const [copied,setCopied]=useState(false);const [error,setError]=useState('');
 const router=useRouter();const addItem=useCartStore(s=>s.addItem);const closeCart=useCartStore(s=>s.closeCart);
 const galleryVariant=variant??colorVariant;const displayImages=galleryVariant?.images?.length?galleryVariant.images:product.images;const price=variant?.price??colorVariant?.price??product.basePrice;const stock=variant?.stock??0;
 const descriptionBlocks=parseProductDescription(product.richDescription);const highlights=normalizeProductHighlights(product.productHighlights??[]);
 const buy=():void=>{if(!variant||stock<quantity)return;if(addProductToCart({product,variant,quantity,addItem})){closeCart();router.push(ROUTES.checkout);}else setError(C.unavailable);};
 const share=async():Promise<void>=>{try{await navigator.clipboard.writeText(window.location.href);setCopied(true);}catch{setCopied(false);}};
 return <main className="pdp-page"><div className="pdp-hero"><ImageGallery images={displayImages}/><section data-scroll-native className="pdp-purchase-card" aria-label={C.productInformation}><div className="pdp-heading"><h1>{product.title}</h1><p aria-live="polite">{formatPrice(price)}{product.comparePrice&&product.comparePrice>price?<del>{formatPrice(product.comparePrice)}</del>:null}</p></div>{product.shortDescription&&<p className="pdp-short-description">{product.shortDescription}</p>}{product.fitDetails&&<div className="pdp-fit-note"><span>{C.fit}</span><p>{product.fitDetails}</p></div>}
 <div className="pdp-variants"><div className="pdp-size-guide"><SizeGuideModal/></div><VariantSelector variants={product.variants} onChange={next=>{setVariant(next);setQuantity(1);setError('');}} onColorChange={next=>{setColorVariant(next);setQuantity(1);}}/></div>
 <div className="pdp-stock" role="status"><Clock3 size={17}/><p>{variant?stock>0?C.available:C.unavailable:C.choose}</p>{variant&&<span>{variant.sku}</span>}</div>
 <div className="pdp-purchase-row"><div className="pdp-quantity" role="group" aria-label={C.quantity}><button type="button" aria-label={C.decrease} disabled={quantity<=1} onClick={()=>setQuantity(current=>current-1)}><Minus size={14}/></button><output aria-live="polite">{quantity}</output><button type="button" aria-label={C.increase} disabled={!variant||quantity>=stock} onClick={()=>setQuantity(current=>current+1)}><Plus size={14}/></button></div><AddToCartButton product={product} variant={variant} quantity={quantity}/></div>
 <button type="button" className="pdp-buy-now" disabled={!variant||stock<quantity||variant.enabled===false} onClick={buy}>{C.buyNow}</button>{error&&<p role="alert">{error}</p>}<p className="pdp-delivery-note">{C.checkoutDelivery}</p><div className="pdp-secondary-actions"><WishlistButton product={product} next={'/product/'+product.slug}/><button type="button" onClick={()=>void share()}><Share2 size={14}/>{copied?C.copied:C.copyLink}</button></div></section></div>
 <div className="pdp-information"><details open><summary>{C.details}</summary><div>{descriptionBlocks.map((block,index)=>block.type==='heading'?<h2 key={index}>{block.text}</h2>:block.type==='list'?<ul key={index}>{block.items.map(item=><li key={item}>{item}</li>)}</ul>:<p key={index}>{block.text}</p>)}{highlights.length>0&&<ul>{highlights.map(highlight=><li key={highlight}>{highlight}</li>)}</ul>}</div></details><details><summary>{C.delivery}</summary><div>{product.shippingReturns?<p>{product.shippingReturns}</p>:<p>{C.checkoutDelivery}</p>}<Link href={ROUTES.returns}>{C.returnsLink}</Link></div></details>{product.materialCare&&<details><summary>{C.care}</summary><div><p>{product.materialCare}</p></div></details>}{product.videoUrl&&<video src={product.mobileVideoUrl||product.videoUrl} poster={product.videoPosterImage||product.images[0]?.url} controls playsInline className="pdp-film"/>}</div>{product.ratings.count>0&&<div className="pdp-reviews"><ReviewSection reviews={product.reviews} rating={product.ratings.avg} count={product.ratings.count}/></div>}</main>;
}
