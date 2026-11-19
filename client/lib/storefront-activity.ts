// Governed by .rules v1.0
import { API_CONFIG } from '@/constants/config';

const storageKey = 'cruisin-storefront-visit';
const idleMs = 30 * 60 * 1000;
type Visit = { id: string; lastSeen: number; device: 'mobile' | 'desktop' };
type Activity = 'visit' | 'bag';
const sent = new Set<Activity>();
let visit: Visit | undefined;

export function trackStorefrontActivity(kind: Activity): void {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible' ||
    window.location.pathname.startsWith('/cms-preview/') ||
    navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  try {
    const now = Date.now();
    visit ??= JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Visit | undefined;
    if (!visit || now - visit.lastSeen >= idleMs) {
      const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      visit = { id: crypto.randomUUID(), lastSeen: now, device: mobile ? 'mobile' : 'desktop' };
      sent.clear();
    }
    visit.lastSeen = now;
    sessionStorage.setItem(storageKey, JSON.stringify(visit));
    const { id, device } = visit;
    const send = (event: Activity): void => {
      if (sent.has(event)) return;
      sent.add(event);
      void fetch(API_CONFIG.baseUrl.replace(/\/$/, '') + '/storefront-activity', {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: id, kind: event, device })
      }).then(response => {
        if (!response.ok && visit?.id === id) sent.delete(event);
      }).catch(() => { if (visit?.id === id) sent.delete(event); });
    };
    send('visit');
    if (kind === 'bag') send('bag');
  } catch {
    // Storage or privacy restrictions must leave storefront interactions usable.
  }
}
