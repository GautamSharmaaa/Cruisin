'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useStorefrontReducedMotion } from '@/hooks/useStorefrontMotion';
import { collectionGridMotion as motion } from '@/lib/animations';
import { storefrontLayoutScrollEvent } from '@/lib/storefront-motion';

interface CollectionGridDensity {
  dense: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  toggleDensity: (trigger: HTMLButtonElement) => void;
}

const preferenceKey = 'cruisin_collection_density';
const photoSelector = ':scope > .editorial-product-card > .editorial-product-media';

export function useCollectionGridDensity(quick: boolean): CollectionGridDensity {
  const reducedMotion = useStorefrontReducedMotion();
  const [dense, setDense] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const animations = useRef(new Set<Animation>());

  const cancelAnimations = useCallback((): void => {
    for (const animation of animations.current) animation.cancel();
    animations.current.clear();
  }, []);

  useEffect(() => {
    try { setDense(localStorage.getItem(preferenceKey) === 'dense'); } catch { /* Storage is optional. */ }
    window.addEventListener('resize', cancelAnimations);
    return () => {
      window.removeEventListener('resize', cancelAnimations);
      cancelAnimations();
    };
  }, [cancelAnimations]);

  useEffect(() => {
    if (reducedMotion) cancelAnimations();
  }, [cancelAnimations, reducedMotion]);

  const toggleDensity = (trigger: HTMLButtonElement): void => {
    const next = !dense;
    const grid = gridRef.current;
    const toolbar = trigger.closest('.collection-controls-surface');
    const top = Math.max(0, toolbar?.getBoundingClientRect().bottom ?? 0);
    const { innerWidth: width, innerHeight: height, scrollY } = window;
    const visible = (rect: DOMRectReadOnly): boolean => rect.width > 0 && rect.height > 0 && rect.bottom > top && rect.top < height;
    const photos = Array.from(grid?.querySelectorAll<HTMLElement>(photoSelector) ?? []);
    // Read the current visual boxes so a second press can reverse the movement in place.
    const before = photos.map(photo => ({ photo, rect: photo.getBoundingClientRect() }));
    const anchor = grid && grid.getBoundingClientRect().top < top - 1
      ? before.find(({ rect }) => visible(rect))
      : undefined;
    const interrupted = animations.current.size > 0;
    cancelAnimations();
    flushSync(() => setDense(next));
    try { localStorage.setItem(preferenceKey, next ? 'dense' : 'regular'); } catch { /* Storage is optional. */ }

    if (anchor) {
      const destination = anchor.photo.getBoundingClientRect();
      const visibleTop = Math.max(top, anchor.rect.top);
      const fraction = (visibleTop - anchor.rect.top) / anchor.rect.height;
      const offset = destination.top + destination.height * fraction - visibleTop;
      if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'instant' });
      if (scrollY !== window.scrollY) window.dispatchEvent(new Event(storefrontLayoutScrollEvent));
    }

    if (reducedMotion || typeof trigger.animate !== 'function') return;

    const duration = quick ? motion.quickDuration : motion.duration;
    const easing = motion.easing;
    const play = (element: HTMLElement, frames: Keyframe[], timing: KeyframeAnimationOptions): void => {
      const animation = element.animate(frames, timing);
      animations.current.add(animation);
      animation.addEventListener('finish', () => animations.current.delete(animation), { once: true });
    };
    const pairs = before.map(({ photo, rect }) => ({ photo, from: rect, to: photo.getBoundingClientRect() }));
    for (const { photo, from, to } of pairs) {
      if ((!visible(from) && !visible(to)) || to.width === 0 || to.height === 0) continue;
      const waveRect = next ? from : to;
      const across = Math.abs(waveRect.left + waveRect.width / 2 - width / 2) / (width / 2);
      const down = Math.max(0, waveRect.top - top) / height;
      const distance = Math.min(1, across * .7 + down * .3);
      const delay = interrupted ? 0 : (next ? 1 - distance : distance) * motion.stagger * duration / motion.duration;
      const scaleX = from.width / to.width;
      const scaleY = from.height / to.height;
      const x = from.left - to.left + (from.width - to.width) / 2;
      const y = from.top - to.top + (from.height - to.height) / 2;
      // Give the smaller tiles more room as they cross rows.
      const remainingTravel = next ? .78 : .18;
      const remainingScale = next ? .16 : .84;
      play(photo, [
        { transformOrigin: 'center', transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})` },
        { offset: .58, transformOrigin: 'center', transform: `translate(${x * remainingTravel}px, ${y * remainingTravel}px) scale(${1 + (scaleX - 1) * remainingScale}, ${1 + (scaleY - 1) * remainingScale})` },
        { transformOrigin: 'center', transform: 'translate(0, 0) scale(1, 1)' },
      ], { duration, delay, easing, fill: 'backwards' });

      const caption = next ? null : photo.parentElement?.querySelector<HTMLElement>('.editorial-product-caption');
      if (caption && visible(to)) {
        play(caption, [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: duration * .55, delay: delay + duration * .45, easing, fill: 'backwards' });
      }
    }

    const icon = trigger.querySelector('img');
    if (icon) {
      play(icon, [
        { scale: '1' },
        { scale: next ? '.92' : '1.06', offset: .34 },
        { scale: '1' },
      ], { duration, easing });
    }
  };

  return { dense, gridRef, toggleDensity };
}
