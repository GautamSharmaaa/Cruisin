'use client';
import * as Popover from '@radix-ui/react-popover';
import Image from 'next/image';
import { Instagram, Moon, Sun, GalleryVerticalEnd, X, ArrowUpRight } from 'lucide-react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CruisinStories } from './cruisin-stories';
import { CRUISIN_HUB_COPY as C } from '@/constants/cruisin-hub-copy';
import { FOOTER_COPY } from '@/constants/footer-copy';
import { useCircularTheme } from '@/hooks/useCircularTheme';
import { cruisinHubMotion } from '@/lib/animations';
import { useSiteSettings } from '@/hooks/useMerchandising';
import { DEFAULT_STOREFRONT_APPEARANCE, storefrontColorSchema } from '@cruisin/contracts/storefront-appearance';

export interface CruisinHubProps { onStoriesChange?: (open: boolean) => void; }
export function CruisinHub({ onStoriesChange }: CruisinHubProps): ReactNode {
  const [menu, setMenu] = useState(false), [stories, setStories] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { dark, toggle } = useCircularTheme();
  const settings = useSiteSettings();
  const light = storefrontColorSchema.safeParse(settings.data?.cruisinRingColorLight);
  const night = storefrontColorSchema.safeParse(settings.data?.cruisinRingColorDark);
  const variables = { '--hub-menu-ms': cruisinHubMotion.menuMs + 'ms', '--hub-orbit-ms': cruisinHubMotion.orbitMs + 'ms',
    '--hub-ring-light': light.success ? light.data : DEFAULT_STOREFRONT_APPEARANCE.cruisinRingColorLight,
    '--hub-ring-dark': night.success ? night.data : DEFAULT_STOREFRONT_APPEARANCE.cruisinRingColorDark } as CSSProperties;
  const openStories = (open: boolean): void => { setStories(open); onStoriesChange?.(open); };
  return <>
    <Popover.Root open={menu} onOpenChange={setMenu}><Popover.Trigger asChild><button ref={trigger} type="button" className="cruisin-hub-trigger" style={variables} aria-label={menu ? C.close : C.open} data-open={menu}>
      <span aria-hidden="true" className="cruisin-hub-halo"/><span aria-hidden="true" className="cruisin-hub-orbit"/>
      <span aria-hidden="true" className="cruisin-hub-logo"><Image src="/cruisin-logo.svg" alt="" width={44} height={28} unoptimized/></span><X aria-hidden="true" className="cruisin-hub-cross" size={22} />
    </button></Popover.Trigger><Popover.Portal><Popover.Content className="cruisin-hub-menu" style={variables} side="top" align="end" sideOffset={12} collisionPadding={16} aria-label={C.menu} onCloseAutoFocus={event => { if (stories) event.preventDefault(); }}>
      <p className="cruisin-hub-heading">{C.brand}</p>
      <button type="button" onClick={event => { void toggle(event.currentTarget); }} aria-label={dark ? C.light : C.dark}>{dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? C.lightLabel : C.darkLabel}</span><span className="cruisin-hub-theme-dot" aria-hidden="true" /></button>
      <a href={FOOTER_COPY.instagram} target="_blank" rel="noopener noreferrer" aria-label={C.instagramLabel} onClick={() => setMenu(false)}><Instagram size={18} /><span>{C.instagram}</span><ArrowUpRight size={14} /></a>
      <button type="button" onClick={() => { setMenu(false); openStories(true); }}><GalleryVerticalEnd size={18} /><span>{C.stories}</span><span className="cruisin-hub-story-dot" aria-hidden="true" /></button>
      <Popover.Arrow className="cruisin-hub-arrow" />
    </Popover.Content></Popover.Portal></Popover.Root>
    {stories && <CruisinStories opener={trigger} onClose={() => openStories(false)} />}
  </>;
}
