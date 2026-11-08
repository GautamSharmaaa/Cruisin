'use client';
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTheme } from 'next-themes';
import { cruisinHubMotion } from '@/lib/animations';

export const useCircularTheme = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const busy = useRef(false);
  const toggle = async (button: HTMLElement): Promise<void> => {
    if (busy.current) return;
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!document.startViewTransition || reduced.matches) { setTheme(next); return; }
    busy.current = true;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const root = document.documentElement;
    root.dataset.themeReveal = 'active';
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
      // flushSync also flushes next-themes' palette effect. Rendering is suspended
      // inside this callback, so waiting for an animation frame would stall capture.
    });
    const stop = (): void => transition.skipTransition();
    reduced.addEventListener('change', stop);
    try {
      await transition.ready;
      if (!reduced.matches) {
        const animation = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
          duration: cruisinHubMotion.revealMs, easing: cruisinHubMotion.revealEase, pseudoElement: '::view-transition-new(root)', fill: 'both',
        });
        await animation.finished;
      }
    } catch { /* Navigation or another view transition can supersede this reveal. The selected theme remains applied. */ }
    finally {
      transition.skipTransition();
      await transition.finished.catch(() => undefined);
      reduced.removeEventListener('change', stop);
      delete root.dataset.themeReveal;
      busy.current = false;
    }
  };
  return { dark: resolvedTheme === 'dark', toggle };
};
