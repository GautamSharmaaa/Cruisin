// Governed by .rules v1.0
import { useSyncExternalStore } from 'react';
import {
  isMetaStorefrontPath, META_CONSENT_LIFETIME_MS, META_CONSENT_VERSION, type MetaBrowserAttribution
} from '@cruisin/contracts/meta-commerce';
import { isAssistedWindow } from '@/lib/access-token';

type ConsentChoice = 'allowed' | 'declined';
type PreferenceSource = 'default' | 'shopper';
interface MarketingPreference {
  version: number;
  choice: ConsentChoice;
  expiresAt: number;
  consentId?: string;
  source?: PreferenceSource;
  pendingRevocations: string[];
}

const storageKey = 'cruisin:marketing-preference';
export const marketingPreferenceEvent = 'cruisin:marketing-preference-change';
export const openMarketingPreferencesEvent = 'cruisin:open-marketing-preferences';
const clickStorageKey = 'cruisin:meta:click';
let memoryPreference: MarketingPreference | undefined;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const browserId = /^fb\.\d{1,3}\.\d{13}\.[A-Za-z0-9_-]+$/;
export const marketingDefaultsOn = process.env.NEXT_PUBLIC_META_MARKETING_DEFAULT !== 'opt-in';

export const getMetaPixelId = (): string => {
  const configured = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? '';
  return /^\d{5,32}$/.test(configured) ? configured : '';
};

export const browserOptsOut = (): boolean => typeof navigator !== 'undefined' && (
  navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
);

export const canShowMarketingPreferences = (): boolean => {
  if (typeof window === 'undefined' || !getMetaPixelId()) return false;
  try {
    return !isAssistedWindow() && !window.location.pathname.startsWith('/cms-preview');
  } catch {
    return false;
  }
};

const readPreference = (): MarketingPreference | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return memoryPreference;
    const parsed = JSON.parse(raw) as Partial<MarketingPreference> | null;
    if (parsed?.version !== META_CONSENT_VERSION || (parsed.choice !== 'allowed' && parsed.choice !== 'declined')) return undefined;
    const expiresAt = Number(parsed.expiresAt);
    if (!Number.isFinite(expiresAt)) return undefined;
    const consentId = typeof parsed.consentId === 'string' && uuid.test(parsed.consentId) ? parsed.consentId : undefined;
    return { version: parsed.version, choice: parsed.choice, expiresAt, consentId,
      source: parsed.source === 'default' ? 'default' : 'shopper',
      pendingRevocations: (Array.isArray(parsed.pendingRevocations) ? parsed.pendingRevocations : []).filter(id => typeof id === 'string' && uuid.test(id)) };
  } catch {
    return memoryPreference;
  }
};

const savePreference = (preference: MarketingPreference): void => {
  memoryPreference = preference;
  try { window.localStorage.setItem(storageKey, JSON.stringify(preference)); } catch { /* Remain usable with browser storage blocked. */ }
  window.dispatchEvent(new Event(marketingPreferenceEvent));
};

const clearTrackingCookies = (): void => {
  try { window.sessionStorage.removeItem(clickStorageKey); } catch { /* Session storage is optional. */ }
  const labels = window.location.hostname.split('.');
  for (const cookie of ['_fbp', '_fbc']) {
    const expiry = cookie + '=; Path=/; Max-Age=0; SameSite=Lax';
    document.cookie = expiry;
    for (let index = 0; index < labels.length - 1; index += 1) {
      document.cookie = expiry + '; Domain=' + labels.slice(index).join('.');
    }
  }
};

export const setMarketingPreference = (choice: ConsentChoice, source: PreferenceSource = 'shopper'): void => {
  if (!canShowMarketingPreferences()) return;
  const previous = readPreference();
  const allowed = choice === 'allowed' && !browserOptsOut() && typeof crypto.randomUUID === 'function';
  const reuse = allowed && previous?.choice === 'allowed' && previous.expiresAt > Date.now() && previous.source === source;
  const consentId = allowed ? (reuse && previous.consentId ? previous.consentId : crypto.randomUUID()) : undefined;
  const pendingRevocations = new Set(previous?.pendingRevocations ?? []);
  if (previous?.consentId && previous.consentId !== consentId) pendingRevocations.add(previous.consentId);
  if (!allowed) clearTrackingCookies();
  savePreference({
    version: META_CONSENT_VERSION, choice: allowed ? 'allowed' : 'declined',
    expiresAt: reuse ? previous.expiresAt : Date.now() + META_CONSENT_LIFETIME_MS,
    consentId, source, pendingRevocations: [...pendingRevocations]
  });
};

export const getPendingMetaRevocations = (): string[] => readPreference()?.pendingRevocations ?? [];

export const acknowledgeMetaRevocation = (consentId: string): void => {
  const preference = readPreference();
  if (preference?.pendingRevocations.includes(consentId)) savePreference({
    ...preference, pendingRevocations: preference.pendingRevocations.filter(id => id !== consentId)
  });
};

export const respectBrowserPrivacy = (): void => {
  const preference = readPreference();
  if (preference?.choice !== 'allowed') return;
  if (browserOptsOut()) setMarketingPreference('declined');
  else if (!marketingDefaultsOn && preference.source === 'default' && preference.consentId) {
    clearTrackingCookies();
    savePreference({
      ...preference, consentId: undefined, expiresAt: 0,
      pendingRevocations: [...new Set([...preference.pendingRevocations, preference.consentId])]
    });
  }
};

export const getMarketingConsentId = (): string | undefined => {
  if (!canShowMarketingPreferences() || browserOptsOut()) return undefined;
  const preference = readPreference();
  return preference?.choice === 'allowed' && preference.expiresAt > Date.now() &&
    (marketingDefaultsOn || preference.source !== 'default') ? preference.consentId : undefined;
};

export const getMarketingConsentSource = (consentId: string): PreferenceSource => {
  const preference = readPreference();
  return preference?.consentId === consentId && preference.source === 'default' ? 'default' : 'shopper';
};

export const initializeMarketingPreference = (): void => {
  if (!marketingDefaultsOn || !canShowMarketingPreferences() || browserOptsOut() ||
      !isMetaStorefrontPath(window.location.pathname) || typeof crypto.randomUUID !== 'function') return;
  if (readPreference()?.choice === 'declined' || getMarketingConsentId()) return;
  setMarketingPreference('allowed', 'default');
};

const getPreferenceState = (): ConsentChoice | 'unset' | 'unavailable' => {
  if (!canShowMarketingPreferences()) return 'unavailable';
  if (browserOptsOut()) return 'declined';
  const preference = readPreference();
  if (preference?.choice === 'declined') return 'declined';
  return getMarketingConsentId() ? 'allowed' : 'unset';
};

const subscribe = (onChange: () => void): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== storageKey && event.key !== null) return;
    memoryPreference = undefined;
    onChange();
  };
  window.addEventListener(marketingPreferenceEvent, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(marketingPreferenceEvent, onChange);
    window.removeEventListener('storage', onStorage);
  };
};

export const useMarketingPreference = () => useSyncExternalStore(subscribe, getPreferenceState, () => 'unavailable' as const);
export const useMarketingConsentId = () => useSyncExternalStore(subscribe, getMarketingConsentId, () => undefined);

const cookieId = (key: string): string | undefined => {
  const found = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(key + '='));
  if (!found) return undefined;
  try {
    const value = decodeURIComponent(found.slice(key.length + 1));
    return value.length <= 512 && browserId.test(value) ? value : undefined;
  } catch { return undefined; }
};

const getClickId = (): string | undefined => {
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  const cookie = cookieId('_fbc');
  try {
    const previous = window.sessionStorage.getItem(clickStorageKey);
    if (fbclid && /^[A-Za-z0-9_-]{1,460}$/.test(fbclid)) {
      const matching = [cookie, previous].find(value => value && browserId.test(value) && value.endsWith('.' + fbclid));
      const value = matching ?? 'fb.1.' + Date.now() + '.' + fbclid;
      if (previous !== value) window.sessionStorage.setItem(clickStorageKey, value);
      return value;
    }
    return cookie ?? (previous && browserId.test(previous) ? previous : undefined);
  } catch {
    return cookie;
  }
};

export const getMetaAttribution = (): MetaBrowserAttribution | undefined => {
  const consentId = getMarketingConsentId();
  if (!consentId || !isMetaStorefrontPath(window.location.pathname)) return undefined;
  const pixelId = getMetaPixelId();
  return { pixelId, consentId, fbp: cookieId('_fbp'), fbc: getClickId() };
};
