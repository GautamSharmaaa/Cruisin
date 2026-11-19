'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import Lenis from 'lenis';
import { useStorefrontExperience } from '@/hooks/useStorefrontExperience';
import { useStorefrontReducedMotion } from '@/hooks/useStorefrontMotion';
import { storefrontEase } from '@/lib/storefront-motion';

export interface SmoothStorefrontProps { children: ReactNode; }

const desktopPointer = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const horizontalSurfaces = '[data-gallery-scroll],.editorial-header-links,.collection-categories';
const nativeSurfaces = '[role="dialog"],[data-lenis-prevent],[data-scroll-native],textarea,input,select';

export function SmoothStorefront({ children }: SmoothStorefrontProps): ReactNode {
  const { scrollBehavior, motionPace } = useStorefrontExperience();
  const isPreview = usePathname().startsWith('/cms-preview/');
  const reducedMotion = useStorefrontReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia(desktopPointer);
    let lenis: Lenis | undefined;

    const checkLock = (): void => {
      if (!lenis) return;
      const locked = getComputedStyle(document.body).overflow === 'hidden' || root.dataset.themeReveal === 'active';
      if (locked && !lenis.isStopped) lenis.stop();
      if (!locked && lenis.isStopped) lenis.start();
    };
    const sync = (): void => {
      lenis?.destroy();
      lenis = undefined;
      if (scrollBehavior === 'native' || reducedMotion || isPreview || !desktop.matches) {
        root.dataset.scrollMode = 'native';
        return;
      }

      lenis = new Lenis({
        autoRaf: true,
        smoothWheel: true,
        syncTouch: false,
        lerp: motionPace === 'quick' ? .18 : .13,
        anchors: false,
        stopInertiaOnNavigate: true,
        virtualScroll: ({ event, deltaX, deltaY }) =>
          !(event.target instanceof Element && Math.abs(deltaX) > Math.abs(deltaY) && event.target.closest(horizontalSurfaces)),
        prevent: node => node.matches(nativeSurfaces),
      });
      root.dataset.scrollMode = 'smooth';
      checkLock();
    };
    const followAnchor = (event: MouseEvent): void => {
      if (!lenis || lenis.isStopped || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;

      let id: string;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      if (location.hash !== url.hash) history.pushState(history.state, '', url);
      lenis.scrollTo(target, {
        onComplete: () => { if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true }); },
      });
    };

    sync();
    const observer = new MutationObserver(checkLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme-reveal'] });
    desktop.addEventListener('change', sync);
    document.addEventListener('click', followAnchor, true);
    return () => {
      document.removeEventListener('click', followAnchor, true);
      desktop.removeEventListener('change', sync);
      observer.disconnect();
      lenis?.destroy();
      delete root.dataset.scrollMode;
    };
  }, [isPreview, scrollBehavior, motionPace, reducedMotion]);

  return <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'} transition={{ duration: .55, ease: storefrontEase }}>{children}</MotionConfig>;
}
