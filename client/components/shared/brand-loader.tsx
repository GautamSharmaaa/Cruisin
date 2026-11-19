'use client';

import React, { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStorefrontExperience } from '@/hooks/useStorefrontExperience';
import { EXPERIENCE_COPY as C } from '@/constants/experience-copy';
import { experienceMotion } from '@/lib/animations';

export interface BrandLoaderProps {
  inline?: boolean;
  label?: string;
}

export function BrandLoader({ inline = false, label }: BrandLoaderProps): ReactNode {
  const settings = useStorefrontExperience();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (!inline) setMounted(true); }, [inline]);
  const visibleLabel = label || settings.loaderText || C.loading;
  const style = {
    '--loader-duration': (settings.motionPace === 'quick' ? experienceMotion.loaderQuickMs : experienceMotion.loaderMs) + 'ms',
    '--loader-accent': settings.loaderAccent
  } as CSSProperties;

  if (!inline && settings.pageLoader === 'none') return <div role="status" className="sr-only">{visibleLabel}</div>;

  const surface = <div className="brand-loading-surface" data-inline={inline} data-tone={settings.loaderTone} role="status" aria-live="polite" style={style}>
    {settings.pageLoader === 'brand' && <div className="brand-loading-emblem" aria-hidden="true">
      {settings.loaderMark === 'wordmark' ? <span className="brand-wordmark-script brand-loading-wordmark">Cruisin</span> :
        <svg className="brand-loading-symbol" viewBox="0 0 64 64"><path d="m32 8 24 24-24 24L8 32Z"/><path d="m32 20 12 12-12 12-12-12Z"/><path d="M32 8v12M56 32H44M32 56V44M8 32h12"/></svg>}
    </div>}
    <span className="brand-loading-label">{visibleLabel}</span>
    <span className="brand-loading-track" aria-hidden="true" />
  </div>;
  return !inline && mounted ? createPortal(surface, document.body) : surface;
}
