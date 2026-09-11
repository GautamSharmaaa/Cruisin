// Governed by .rules v1.0
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { PromotionPopup } from '@/components/promotion/promotion-popup';
import { usePromotionExperience } from '@/hooks/useMerchandising';
import { isPromotionApplied, isPromotionBrowsingPath, markPromotionSeen, promotionFrequencyReached } from '@/lib/promotion-experience';
import { useCartStore } from '@/store/cartStore';

const alwaysSeenContexts = new Set<string>();

export function PromotionRuntime({ blocked = false }: { blocked?: boolean }): ReactNode {
  const pathname = usePathname();
  const promotion = usePromotionExperience();
  const coupon = useCartStore((state) => state.coupon);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const config = promotion.data;
    if (!config || !config.placements.popup || blocked || !isPromotionBrowsingPath(pathname)) { setOpen(false); return; }
    // Once an open popup applies the linked offer, let PromotionPopup render its
    // success confirmation and close itself. The applied coupon should suppress
    // only future popup openings, not unmount the confirmation mid-transition.
    if (isPromotionApplied(config, coupon)) return;
    if (open) return;
    if (promotionFrequencyReached(config, pathname, alwaysSeenContexts)) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      markPromotionSeen(config, pathname, alwaysSeenContexts);
      setOpen(true);
    }, config.popup.delayMs);
    return () => window.clearTimeout(timer);
  }, [blocked, coupon, open, pathname, promotion.data]);
  if (!promotion.data) return null;
  return <PromotionPopup promotion={promotion.data} open={open} onClose={() => setOpen(false)} />;
}
