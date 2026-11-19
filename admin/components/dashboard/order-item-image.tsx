// Governed by .rules v1.0
'use client';

import { Dialog } from '@cruisin/ui';
import { ImageOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export function OrderItemImage({ image = '', title, catalogue }: { image?: string; title: string; catalogue?: boolean }): ReactNode {
  const [failed, setFailed] = useState(false);
  const src = image.startsWith('/') && !image.startsWith('//')
    ? new URL(image, process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000').href
    : image;
  if (failed || !/^https?:\/\//i.test(src)) return <span className="grid h-10 w-10 place-items-center border border-border text-text-muted" title={`Image unavailable for ${title}`}><ImageOff size={15} /></span>;
  return <Dialog title={title} trigger={<button type="button" aria-label={`Enlarge image of ${title}`} className="block overflow-hidden border border-border hover:border-accent-gold focus-visible:outline focus-visible:outline-accent-gold">
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-10 w-10 object-cover" />
  </button>}>
    {catalogue ? <p className="mb-2 text-xs text-text-secondary">Current catalogue photo</p> : null}
    <img src={src} alt={title} className="max-h-[65vh] w-full object-contain" />
  </Dialog>;
}
