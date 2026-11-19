'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { readOrbitContent } from '@cruisin/contracts/orbit-cards';
import { SafeImage } from '@/components/shared/safe-image';
import { useStorefrontReducedMotion } from '@/hooks/useStorefrontMotion';
import { orbitMotion as M } from '@/lib/animations';
import { ORBIT_COPY as C } from '@/constants/orbit-copy';
import type { CmsSectionDto } from '@/types/dto.types';

export interface OrbitCardsProps { section: CmsSectionDto; }
const wrap = (value: number, range: number): number => ((value % range) + range) % range;

export function OrbitCards({ section }: OrbitCardsProps): ReactNode {
  const config = useMemo(() => readOrbitContent(section.content ?? {}), [section.content]);
  const stage = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLAnchorElement | null)[]>([]);
  const phase = useRef(0);
  const target = useRef(0);
  const hoverOrigin = useRef<{ x: number; angle: number } | null>(null);
  const gesture = useRef<{ x: number; y: number; angle: number; dragging: boolean; pointerId: number; lastX: number; lastTime: number; velocity: number } | null>(null);
  const stride = useRef(280);
  const focused = useRef(false);
  const suppressClick = useRef(false);
  const [paused, setPaused] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const reduced = useStorefrontReducedMotion();
  const count = config?.cards.length ?? 0;
  const step = count ? 360 / count : 0;
  const active = count ? activeSlot % count : 0;
  // Repeat short CMS collections so their loop seam stays beyond the viewport.
  const slotCount = count < 7 ? count * 3 : count;

  useEffect(() => {
    const node = stage.current;
    if (!node || !config) return;
    let width = node.clientWidth, frame = 0, previousTime = 0, previousAngle = NaN, previousWidth = 0;
    const measure = (): void => {
      width = node.clientWidth;
      stride.current = (tiles.current[0]?.offsetWidth ?? 240) + (width < 640 ? 16 : 24);
    };
    measure();
    let visible = false, previousActive = -1;
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setOnScreen(visible);
      if (visible && !frame) { previousTime = 0; frame = requestAnimationFrame(draw); }
    });
    intersection.observe(node);

    const draw = (now: number): void => {
      frame = 0;
      const elapsed = Math.min(M.maxDeltaMs, previousTime ? now - previousTime : 16);
      previousTime = now;
      if (visible && !document.hidden) {
        if (config.autoplay && !paused && hoverOrigin.current === null && !gesture.current && !focused.current && !reduced) {
          target.current += elapsed * 360 / (config.cycleSeconds * 1000);
        }
        const difference = target.current - phase.current;
        phase.current += reduced || Math.abs(difference) < 0.01 ? difference : difference * (1 - Math.exp(-(gesture.current?.dragging ? M.dragResponse : M.response) * elapsed / 1000));
        const angle = phase.current;
        if (angle !== previousAngle || width !== previousWidth) {
          previousAngle = angle;
          previousWidth = width;
          const nearest = wrap(Math.round(angle / step), slotCount);
          if (nearest !== previousActive) { previousActive = nearest; setActiveSlot(nearest); }
          const compact = width < 640;
          tiles.current.forEach((tile, index) => {
            if (!tile) return;
            const offset = wrap(index - angle / step + slotCount / 2, slotCount) - slotCount / 2;
            const x = offset * stride.current;
            const y = offset * offset * (compact ? M.mobileArc : M.desktopArc);
            // A continuous fan keeps cards equally spaced. Loop recycling happens offscreen.
            tile.style.setProperty('--orbit-transform', `translate(-50%,-50%) translate3d(${x}px,${y}px,0) rotate(${offset * M.tilt}deg)`);
            tile.style.setProperty('--orbit-layer', String(100 - Math.round(Math.abs(offset) * 10)));
            tile.style.setProperty('--orbit-visible', Math.abs(x) < width / 2 + stride.current ? '1' : '0');
            tile.style.setProperty('--orbit-hit', Math.abs(x) < width / 2 + stride.current ? 'auto' : 'none');
          });
        }
      }
      if (visible) frame = requestAnimationFrame(draw);
    };
    return () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); };
  }, [config, count, step, slotCount, paused, reduced]);

  if (!config) return null;
  const selected = config.cards[active] ?? config.cards[0];
  const choose = (index: number): void => {
    const nearest = Math.round(target.current / step);
    const distance = wrap(index - nearest + count / 2, count) - count / 2;
    target.current = (nearest + distance) * step;
  };
  const movePointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (!config.mouseControl) return;
    const start = gesture.current;
    if (start) {
      if (event.pointerId !== start.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!start.dragging) {
        if (Math.abs(dx) < M.dragThreshold || Math.abs(dx) < Math.abs(dy)) return;
        start.dragging = true;
        suppressClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const now = performance.now();
      const elapsed = now - start.lastTime;
      if (elapsed > 0) start.velocity = (event.clientX - start.lastX) / elapsed;
      start.lastX = event.clientX;
      start.lastTime = now;
      target.current = start.angle - dx / stride.current * step;
      event.preventDefault();
    } else if (event.pointerType === 'mouse' && !reduced && hoverOrigin.current !== null) {
      const bounds = event.currentTarget.getBoundingClientRect();
      target.current = hoverOrigin.current.angle + (event.clientX - hoverOrigin.current.x) / bounds.width * step * M.hoverCards;
    }
  };
  const finishGesture = (event: PointerEvent<HTMLDivElement>): void => {
    const start = gesture.current;
    if (!start || event.pointerId !== start.pointerId) return;
    if (start.dragging) {
      const velocity = performance.now() - start.lastTime < M.velocityExpiry ? start.velocity : 0;
      const momentum = event.type === 'pointercancel' || reduced ? 0 : Math.max(-M.maxMomentumCards, Math.min(M.maxMomentumCards, velocity * M.momentumMs / stride.current));
      target.current = Math.round(target.current / step - momentum) * step;
    }
    gesture.current = null;
    hoverOrigin.current = event.pointerType === 'mouse' ? { x: event.clientX, angle: target.current } : null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <section className="orbit-section" aria-label={section.title} data-autoplay={config.autoplay} data-mouse-control={config.mouseControl} data-cycle-seconds={config.cycleSeconds}>
    <header className="orbit-heading">
      <div><h2>{section.title}</h2>{section.subtitle && <p>{section.subtitle}</p>}</div>
      <p>{config.mouseControl ? C.help : C.explore}</p>
    </header>
    <div className="orbit-stage" ref={stage} data-gallery-scroll
      onPointerEnter={event => { if (event.pointerType === 'mouse') hoverOrigin.current = { x: event.clientX, angle: target.current }; }}
      onPointerLeave={() => { hoverOrigin.current = null; if (!gesture.current?.dragging) gesture.current = null; }}
      onPointerDown={event => {
        suppressClick.current = false;
        if (config.mouseControl && event.button === 0 && event.isPrimary) {
          target.current = phase.current;
          gesture.current = { x: event.clientX, y: event.clientY, angle: phase.current, dragging: false, pointerId: event.pointerId, lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
        }
      }}
      onPointerMove={movePointer}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) finishGesture(event); }}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}>
      {Array.from({ length: slotCount }, (_, index) => { const card = config.cards[index % count]; return <Link key={index} ref={node => { tiles.current[index] = node; }} className="orbit-card" href={card.href} tabIndex={-1} aria-hidden="true" draggable={false} onDragStart={event => event.preventDefault()}>
        <SafeImage src={card.image} alt="" fill sizes="(max-width:640px) 56vw, (max-width:1024px) 28vw, 300px" draggable={false} />
        {card.video && activeSlot === index && onScreen && !paused && !reduced &&
          <video key={card.video} className="orbit-card-video" src={card.video} autoPlay muted loop playsInline aria-hidden="true"
            onPlaying={event => { event.currentTarget.dataset.playing = 'true'; }}
            onError={event => { delete event.currentTarget.dataset.playing; }} />}
        <span>{card.label}</span>
      </Link>; })}
    </div>
    <div className="orbit-navigation" onFocusCapture={() => { focused.current = true; }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) focused.current = false; }}>
      <div className="orbit-controls">
        <button type="button" aria-label={C.previous} onClick={() => choose(active - 1)}><ArrowLeft size={18} /></button>
        {config.autoplay && !reduced && <button type="button" aria-label={paused ? C.play : C.pause} aria-pressed={paused} onClick={() => { focused.current = false; setPaused(value => !value); }}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
        <button type="button" aria-label={C.next} onClick={() => choose(active + 1)}><ArrowRight size={18} /></button>
      </div>
      <Link className="orbit-destination" href={selected.href}>{selected.label}<ArrowUpRight size={18} /></Link>
      <div className="orbit-dots" role="group" aria-label={C.explore}>{config.cards.map((card, index) => <button type="button" key={index} aria-label={C.choose + card.label} aria-pressed={active === index} onClick={() => choose(index)} />)}</div>
    </div>
  </section>;
}
