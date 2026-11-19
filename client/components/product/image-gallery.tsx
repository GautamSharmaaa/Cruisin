'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGalleryDrag } from '@/hooks/useGalleryDrag';
import { useStorefrontExperience } from '@/hooks/useStorefrontExperience';
import { useStorefrontReducedMotion } from '@/hooks/useStorefrontMotion';
import { SafeImage } from '@/components/shared/safe-image';
import { STOREFRONT_COPY as C } from '@/constants/storefront-copy';
import type { ProductImage } from '@/types/product.types';

export interface ImageGalleryProps { images: ProductImage[]; }

const fallbackImage: ProductImage = { url: '/cruisin-image-fallback.svg', alt: C.gallery, width: 900, height: 1200 };

export function ImageGallery({ images }: ImageGalleryProps): ReactNode {
  const { galleryArrowsEnabled, galleryProgressEnabled } = useStorefrontExperience();
  const reduced = useStorefrontReducedMotion();
  const drag = useGalleryDrag();
  const gallery = images.length ? images : [fallbackImage];
  const firstPhoto = gallery[0].url;
  const track = useRef<HTMLDivElement>(null);
  const slideWidth = useRef(0);
  const current = useRef(0);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    current.current = 0;
    setActive(0);
    track.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [firstPhoto]);

  useEffect(() => {
    const node = track.current;
    const firstSlide = node?.firstElementChild;
    if (!node || !firstSlide) return;
    slideWidth.current = firstSlide.getBoundingClientRect().width;
    const resize = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === slideWidth.current) return;
      slideWidth.current = entry.contentRect.width;
      node.scrollTo({ left: current.current * slideWidth.current, behavior: 'instant' });
    });
    resize.observe(firstSlide);
    return () => resize.disconnect();
  }, [firstPhoto]);

  const move = (index: number): void => {
    const slide = track.current?.children.item(index);
    if (!(slide instanceof HTMLElement)) return;
    track.current?.scrollTo({ left: slide.offsetLeft, behavior: reduced ? 'instant' : 'smooth' });
  };

  const updatePosition = (): void => {
    const node = track.current;
    if (!node || !slideWidth.current) return;
    const nearest = Math.max(0, Math.min(gallery.length - 1, Math.round(node.scrollLeft / slideWidth.current)));
    if (nearest === current.current) return;
    current.current = nearest;
    setActive(nearest);
  };

  return <section className="pdp-gallery" aria-label={C.gallery}>
    <div className="pdp-gallery-visual">
      <div className="pdp-gallery-track" data-gallery-scroll ref={track} {...drag} onScroll={updatePosition}>
        {gallery.map((image, index) => <div className="pdp-gallery-slide" key={image.url}>
          <SafeImage src={image.url} alt={image.alt} fill sizes="(min-width:1024px) 48vw, 100vw" priority={index === 0} className="pdp-gallery-image" draggable={false} />
        </div>)}
      </div>
      {gallery.length > 1 && galleryProgressEnabled && <div className="pdp-gallery-meter" role="progressbar" aria-label={C.gallery}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((active + 1) / gallery.length * 100)}
        style={{ '--gallery-count': gallery.length, '--gallery-index': active } as CSSProperties} />}
    </div>
    {gallery.length > 1 && galleryArrowsEnabled && <div className="pdp-gallery-controls">
      <button type="button" aria-label={C.previous} disabled={active === 0} onClick={() => move(active - 1)}><ChevronLeft size={18} /></button>
      <button type="button" aria-label={C.next} disabled={active === gallery.length - 1} onClick={() => move(active + 1)}><ChevronRight size={18} /></button>
      <span aria-live="polite">{active + 1} / {gallery.length}</span>
    </div>}
  </section>;
}
