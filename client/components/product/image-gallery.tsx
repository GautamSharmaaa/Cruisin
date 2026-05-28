// Governed by .rules v1.0
'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { ProductImage } from '@/types/product.types';

export interface ImageGalleryProps { images: ProductImage[]; }
export function ImageGallery({ images }: ImageGalleryProps): ReactNode { const [active, setActive] = useState(images[0]); if (!active) return null; return <div className="grid gap-px md:grid-cols-[88px_1fr]"><div className="order-2 flex gap-px md:order-1 md:flex-col">{images.map((image) => <button key={image.url} onClick={() => setActive(image)} className="relative aspect-[3/4] w-20 border border-border-subtle"><Image src={image.url} alt={image.alt} fill sizes="88px" className="object-cover" /></button>)}</div><div className="relative order-1 aspect-[3/4] overflow-hidden bg-background-elevated md:order-2"><Image src={active.url} alt={active.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-[1.04]" priority /></div></div>; }
