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
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
    const root = document.documentElement;
    root.dataset.themeReveal = 'active';
    let transition: ViewTransition | undefined, animation: Animation | undefined;
    const stop = (): void => { animation?.cancel(); transition?.skipTransition(); };
    const visibility = (): void => { if (document.hidden) stop(); };
    reduced.addEventListener('change', stop);
    window.addEventListener('resize', stop, { once: true });
    document.addEventListener('visibilitychange', visibility);
    try {
      // Let scrolling and decorative motion settle before either snapshot is taken.
      // This frame is outside the transition update, where rendering is not suspended.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (reduced.matches || document.hidden) { setTheme(next); return; }
      transition = document.startViewTransition(() => { flushSync(() => setTheme(next)); });
      await transition.ready;
      if (!reduced.matches) {
        animation = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
          duration: cruisinHubMotion.revealMs, easing: cruisinHubMotion.revealEase, pseudoElement: '::view-transition-new(root)', fill: 'both',
        });
        await animation.finished;
      }
      // Hand the final composited frame back to the live page naturally; forcing
      // skipTransition here can discard that last frame and produce a visible snap.
      await transition.finished;
    } catch { transition?.skipTransition(); /* Interruption keeps the selected palette. */ }
    finally {
      await transition?.finished.catch(() => undefined);
      animation?.cancel();
      reduced.removeEventListener('change', stop);
      window.removeEventListener('resize', stop);
      document.removeEventListener('visibilitychange', visibility);
      delete root.dataset.themeReveal;
      busy.current = false;
    }
  };
  return { dark: resolvedTheme === 'dark', toggle };
};
