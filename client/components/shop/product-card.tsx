'use client';
import type {ReactNode} from 'react';
import {EditorialProductCard} from './editorial-product-card';
import type {Product} from '@/types/product.types';
import type {GridView} from './product-grid';
export interface ProductCardProps {product:Product;view?:GridView;priority?:boolean;preferredColor?:string;preferredSize?:string;}
export function ProductCard({product,priority=false}:ProductCardProps):ReactNode{return <EditorialProductCard product={product} priority={priority}/>;}
