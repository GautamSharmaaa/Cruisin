'use client';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { SafeImage } from '@/components/shared/safe-image';
import { CRUISIN_HUB_COPY as C } from '@/constants/cruisin-hub-copy';
import { useStorefrontStories } from '@/hooks/useStorefrontStories';
import { useStorefrontReducedMotion } from '@/hooks/useStorefrontMotion';
import { cruisinHubMotion as M } from '@/lib/animations';

const mobileQuery = '(max-width: 1023px)';
const subscribeMobile = (notify: () => void): (() => void) => {
  const query = matchMedia(mobileQuery); query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
export interface CruisinStoriesProps { open:boolean; onClose: () => void; opener: RefObject<HTMLButtonElement | null>; }
export function CruisinStories({ open, onClose, opener }: CruisinStoriesProps): ReactNode {
  const query = useStorefrontStories(open);
  const mobile = useSyncExternalStore(subscribeMobile, () => matchMedia(mobileQuery).matches, () => false);
  const stories = (query.data ?? []).filter(story => mobile ? !story.hideOnMobile : !story.hideOnDesktop);
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [hidden, setHidden] = useState(false);
  const [held, setHeld] = useState(false), [loaded, setLoaded] = useState('');
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduced = useStorefrontReducedMotion();
  const position = Math.min(index, Math.max(0, stories.length - 1)), story = stories[position];
  // The viewer is portrait on every device; prefer the CMS portrait/mobile artwork.
  const asset = story?.mobile || story?.desktop || '';
  const readyKey = story ? story.id + asset : '';
  const stopped = !open || paused || held || hidden || reduced || loaded !== readyKey;
  const move = (direction: number): void => { setIndex(Math.max(0, Math.min(stories.length - 1, position + direction))); setHeld(false); };
  useEffect(() => {
    const update = (): void => setHidden(document.hidden); update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(()=>{if(open){setIndex(0);setPaused(false);setHeld(false);setLoaded('');}},[open]);
  const variables = { '--hub-menu-ms': M.menuMs + 'ms', '--story-ms': M.storyMs + 'ms', '--story-exit-ms':M.storyExitMs+'ms' } as CSSProperties;
  return <Dialog.Root open={open} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="cruisin-stories-overlay" style={variables} />
    <Dialog.Content className="cruisin-stories" style={variables} aria-describedby={undefined} data-lenis-prevent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}
      onKeyDownCapture={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      }}>
      <Dialog.Title className="sr-only">{C.storiesTitle}</Dialog.Title>
      <header className="cruisin-stories-toolbar"><span className="cruisin-stories-brand">{C.brand}</span><div>
        {story && !reduced && <button type="button" aria-label={paused ? C.play : C.pause} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={20} /> : <Pause size={20} />}</button>}
        <Dialog.Close aria-label={C.closeStories}><X size={24} /></Dialog.Close>
      </div></header>
      {story ? <>
        <div className="cruisin-story-progress" aria-hidden="true">{stories.map((item, n) => <span key={item.id} data-complete={n < position}><i key={item.id + ':' + position} data-current={n === position} data-paused={stopped} onAnimationEnd={() => { if (n === position && !stopped) { if (position < stories.length - 1) move(1); else onClose(); } }} /></span>)}</div>
        <article className="cruisin-story-card" key={story.id} data-story-id={story.id} onPointerDown={event => {
          if ((event.target as HTMLElement).closest('a,button')) return;
          touch.current = { x: event.clientX, y: event.clientY }; setHeld(true);
        }} onPointerUp={event => {
          const start = touch.current; touch.current = null; setHeld(false);
          if (!start) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.abs(dx) > M.swipeDistance && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        }} onPointerCancel={() => { touch.current = null; setHeld(false); }} onPointerLeave={() => { touch.current = null; setHeld(false); }}>
          <p className="cruisin-story-label">{story.label}</p>
          <div className="cruisin-story-media"><SafeImage key={readyKey} src={asset} alt={story.alt} fill sizes="(max-width: 600px) 90vw, 440px" draggable={false} onLoad={() => setLoaded(readyKey)} /></div>
          <div className="cruisin-story-caption"><h2>{story.title}</h2>{story.subtitle && <p>{story.subtitle}</p>}<Link href={story.href} onClick={onClose}>{story.cta}<ArrowUpRight size={16} /></Link></div>
        </article>
        <div className="cruisin-story-controls"><button type="button" disabled={position === 0} aria-label={C.previous} onClick={() => move(-1)}><ArrowLeft size={20} /></button><span role="status" aria-live="polite">{C.position.replace('{current}', String(position + 1)).replace('{total}', String(stories.length))}</span><button type="button" disabled={position === stories.length - 1} aria-label={C.next} onClick={() => move(1)}><ArrowRight size={20} /></button></div>
      </> : <div className="cruisin-stories-empty" role="status">{query.isPending ? <><span className="cruisin-story-skeleton" />{C.loading}</> : query.isError ? <><p>{C.error}</p><button type="button" onClick={() => { void query.refetch(); }}>{C.retry}</button></> : C.empty}</div>}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
