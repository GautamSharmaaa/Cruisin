// Governed by .rules v1.0
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { ProductImage } from '@/types/product.types';
import { SafeImage } from '@/components/shared/safe-image';

export interface ImageGalleryProps { images: ProductImage[]; }
export function ImageGallery({ images }: ImageGalleryProps): ReactNode {
  const [active, setActive] = useState(images[0]);
  const firstImageUrl = images[0]?.url;
  useEffect(() => {
    setActive(images[0]);
  }, [firstImageUrl, images]);
  if (!active) return null;
  return (
    <div className="grid min-w-0 gap-px md:grid-cols-[88px_1fr]">
      <div className="order-2 flex min-w-0 max-w-full gap-px overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
        {images.map((image) => (
          <button key={image.url} onClick={() => setActive(image)} className="relative aspect-[3/4] w-20 shrink-0 border border-border-subtle">
            <SafeImage src={image.url} alt={image.alt} fill sizes="88px" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="relative order-1 aspect-[3/4] min-w-0 overflow-hidden bg-background-elevated md:order-2">
        <SafeImage src={active.url} alt={active.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-[1.04]" priority />
      </div>
    </div>
  );
}
