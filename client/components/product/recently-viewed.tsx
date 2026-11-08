
'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {EditorialProductCard} from '@/components/shop/editorial-product-card';
import {filterCustomerVisibleProducts} from '@/lib/customer-state';
import {STOREFRONT_COPY as C} from '@/constants/storefront-copy';
import type {Product} from '@/types/product.types';
export interface RecentlyViewedProps {}
export function RecentlyViewed(_props:RecentlyViewedProps):ReactNode{const [items,setItems]=useState<Product[]>([]);const pathname=usePathname();useEffect(()=>{try{const parsed:unknown=JSON.parse(localStorage.getItem('cruisin_recently_viewed_products')??'[]');if(Array.isArray(parsed))setItems(filterCustomerVisibleProducts(parsed as Product[]).filter(item=>'/product/'+item.slug!==pathname).slice(0,4));}catch{setItems([]);}},[pathname]);if(!items.length)return null;return <section className="pdp-related"><h2>{C.recent}</h2><div className="collection-product-grid">{items.map(product=><EditorialProductCard key={product.id} product={product}/>)}</div></section>;}
