// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface RevolvingBagProps {
  size?: 'display' | 'icon';
}

export function RevolvingBag({ size = 'display' }: RevolvingBagProps): ReactNode {
  const face = <><span className="empty-bag-handle" /><span className="empty-bag-anchor empty-bag-anchor-left" /><span className="empty-bag-anchor empty-bag-anchor-right" /><span className="empty-bag-rim" /><span className="empty-bag-fold empty-bag-fold-left" /><span className="empty-bag-fold empty-bag-fold-right" /><span className="empty-bag-base" /><span className="empty-bag-wordmark">Cruisin</span></>;
  return <span className={'empty-bag-scene' + (size === 'icon' ? ' revolving-bag-icon' : '')} data-revolving-bag={size} aria-hidden="true">
    <span className="empty-bag-rotator">
      <span className="empty-bag-face empty-bag-front">{face}</span>
      <span className="empty-bag-face empty-bag-back">{face}</span>
      <span className="empty-bag-side empty-bag-side-left" />
      <span className="empty-bag-side empty-bag-side-right" />
    </span>
    <span className="empty-bag-shadow" />
  </span>;
}
