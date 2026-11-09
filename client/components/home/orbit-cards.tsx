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
  const hoverOrigin = useRef<number | null>(null);
  const gesture = useRef<{ x: number; y: number; angle: number; dragging: boolean } | null>(null);
  const focused = useRef(false);
  const suppressClick = useRef(false);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const reduced = useStorefrontReducedMotion();
  const count = config?.cards.length ?? 0;
  const step = count ? 360 / count : 0;

  useEffect(() => {
    const node = stage.current;
    if (!node || !config) return;
    let width = node.clientWidth, frame = 0, previousTime = 0, previousAngle = NaN, previousWidth = 0;
    let visible = false, previousActive = -1;
    const resize = new ResizeObserver(() => { width = node.clientWidth; });
    resize.observe(node);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '100px' });
    intersection.observe(node);

    const draw = (now: number): void => {
      const elapsed = Math.min(M.maxDeltaMs, previousTime ? now - previousTime : 16);
      previousTime = now;
      if (visible && !document.hidden) {
        if (config.autoplay && !paused && hoverOrigin.current === null && !gesture.current && !focused.current && !reduced) {
          target.current += elapsed * 360 / (config.cycleSeconds * 1000);
        }
        const difference = target.current - phase.current;
        phase.current += reduced || Math.abs(difference) < 0.01 ? difference : difference * (1 - Math.exp(-M.response * elapsed / 1000));
        const angle = phase.current;
        if (angle !== previousAngle || width !== previousWidth) {
          previousAngle = angle;
          previousWidth = width;
          const nearest = wrap(Math.round(angle / step), count);
          if (nearest !== previousActive) { previousActive = nearest; setActive(nearest); }
          const compact = width < 640;
          tiles.current.forEach((tile, index) => {
            if (!tile) return;
            const degrees = wrap(index * step - angle + 180, 360) - 180;
            const radians = degrees * Math.PI / 180;
            const depth = Math.cos(radians);
            const x = Math.sin(radians) * width * (compact ? 0.72 : 0.34);
            const y = (1 - depth) * (compact ? 65 : 100);
            tile.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${depth * 65}px) rotateY(${-degrees * 0.28}deg) rotateZ(${degrees * 0.16}deg) scale(${0.88 + depth * 0.12})`;
            tile.style.opacity = String(Math.max(0, Math.min(1, (depth + 0.05) * 4)));
            tile.style.zIndex = String(Math.round(100 + depth * 50));
            tile.style.pointerEvents = depth > 0 ? 'auto' : 'none';
          });
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); };
  }, [config, count, step, paused, reduced]);

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
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!start.dragging) {
        if (Math.abs(dx) < M.dragThreshold || Math.abs(dx) < Math.abs(dy)) return;
        start.dragging = true;
        suppressClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      target.current = start.angle - dx * M.dragDegrees;
      event.preventDefault();
    } else if (event.pointerType === 'mouse' && !reduced && hoverOrigin.current !== null) {
      const bounds = event.currentTarget.getBoundingClientRect();
      target.current = hoverOrigin.current + ((event.clientX - bounds.left) / bounds.width - 0.5) * M.hoverDegrees;
    }
  };
  const finishGesture = (): void => {
    if (gesture.current?.dragging) target.current = Math.round(target.current / step) * step;
    gesture.current = null;
    if (hoverOrigin.current !== null) hoverOrigin.current = target.current;
  };

  return <section className="orbit-section" aria-label={section.title} data-autoplay={config.autoplay} data-mouse-control={config.mouseControl} data-cycle-seconds={config.cycleSeconds}>
    <header className="orbit-heading">
      <div><h2>{section.title}</h2>{section.subtitle && <p>{section.subtitle}</p>}</div>
      <p>{config.mouseControl ? C.help : C.explore}</p>
    </header>
    <div className="orbit-stage" ref={stage} data-gallery-scroll
      onMouseEnter={() => { hoverOrigin.current = target.current; }}
      onMouseLeave={() => { hoverOrigin.current = null; if (!gesture.current?.dragging) gesture.current = null; }}
      onPointerDown={event => {
        suppressClick.current = false;
        if (config.mouseControl && event.button === 0) gesture.current = { x: event.clientX, y: event.clientY, angle: target.current, dragging: false };
      }}
      onPointerMove={movePointer}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) finishGesture(); }}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}>
      {config.cards.map((card, index) => <Link key={index} ref={node => { tiles.current[index] = node; }} className="orbit-card" href={card.href} tabIndex={-1} aria-hidden="true" draggable={false} onDragStart={event => event.preventDefault()}>
        <SafeImage src={card.image} alt="" fill sizes="(max-width:640px) 56vw, 28vw" draggable={false} />
        <span>{card.label}</span>
      </Link>)}
      <div className="orbit-floor" aria-hidden="true" />
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
