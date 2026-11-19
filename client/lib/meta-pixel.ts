// Governed by .rules v1.0
import {
  isMetaStorefrontPath, metaPurchaseEventId, type MetaBrowserAttribution, type MetaCommerceEventName
} from '@cruisin/contracts/meta-commerce';
import { mirrorMetaEvent } from '@/lib/meta-capi';
import { getMetaAttribution, getMetaPixelId } from '@/lib/meta-consent';

export const META_CURRENCY = 'INR' as const;

export interface MetaContentInput { id: string; quantity: number; item_price: number; }
export interface MetaCommerceInput {
  contents: MetaContentInput[];
  value: number;
  content_name?: string;
  content_category?: string;
}
export interface MetaSearchInput { content_ids?: string[]; num_results: number; }
export interface MetaCheckoutInput extends MetaCommerceInput { num_items?: number; }
export interface MetaPaymentInput extends MetaCheckoutInput { payment_method: 'cod' | 'online' | 'online_partial'; }
export interface MetaPurchaseInput extends MetaCheckoutInput { order_id: string; }

interface MetaCommerceParameters extends MetaCommerceInput {
  content_ids: string[];
  content_type: 'product';
  currency: typeof META_CURRENCY;
  num_items: number;
  payment_method?: MetaPaymentInput['payment_method'];
  order_id?: string;
}

export interface MetaFbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: MetaFbq;
  loaded?: boolean;
  version?: string;
  disablePushState?: boolean;
}

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
    __cruisinMetaPixelIds?: Record<string, true>;
  }
}

const libraryUrl = 'https://connect.facebook.net/en_US/fbevents.js';
let pixelHasConsent = false;
let lastPageView: string | undefined;
let eventCounter = 0;

const isSafePixelUrl = (url: { pathname: string; search: string; hash: string }): boolean => {
  if (!isMetaStorefrontPath(url.pathname) || (url.hash && url.hash !== '#main')) return false;
  for (const [key, value] of new URLSearchParams(url.search)) {
    if (key === 'order' && url.pathname === '/checkout/success' && /^[a-f0-9]{24}$/i.test(value)) continue;
    if (key === 'fbclid' && /^[A-Za-z0-9_-]{1,460}$/.test(value)) continue;
    if (/^(utm_(source|medium|campaign|content|id)|sort|view|category|collection|tags|size|color|sale|priceMin|priceMax|gender|availability)$/.test(key)
        && /^[A-Za-z0-9_.-]{1,80}$/.test(value)) continue;
    return false;
  }
  return true;
};

function installPixel(): MetaFbq | undefined {
  if (window.fbq) return window.fbq;
  if (typeof document === 'undefined') return undefined;
  const queue: MetaFbq = (...args) => {
    if (queue.callMethod) queue.callMethod.apply(queue, args);
    else queue.queue?.push(args);
  };
  queue.queue = [];
  queue.push = queue;
  queue.loaded = true;
  queue.version = '2.0';
  window.fbq = queue;
  window._fbq ??= queue;
  const script = document.createElement('script');
  script.id = 'cruisin-meta-pixel-library';
  script.async = true;
  script.src = libraryUrl;
  document.head.append(script);
  document.documentElement.setAttribute('data-cruisin-meta-bootstrap', 'ready');
  return queue;
}

export const suspendMetaPixel = (): void => {
  if (typeof window === 'undefined' || !pixelHasConsent) return;
  const fbq = window.fbq;
  if (fbq?.queue && !fbq.callMethod) {
    // Keep setup commands for a subsequent allowed route, drop unsent events.
    fbq.queue = fbq.queue.filter(args => args[0] === 'init' || args[0] === 'set');
  }
  fbq?.('consent', 'revoke');
  pixelHasConsent = false;
};

export const initializeMetaPixel = (pixelId = getMetaPixelId()): boolean => {
  const attribution = getMetaAttribution();
  if (!attribution || attribution.pixelId !== pixelId || !isSafePixelUrl(window.location)) {
    suspendMetaPixel();
    return false;
  }
  const fbq = installPixel();
  if (!fbq) return false;
  fbq.disablePushState = true;
  if (!pixelHasConsent) fbq('consent', 'grant');
  pixelHasConsent = true;
  const initialized = window.__cruisinMetaPixelIds ??= {};
  if (!initialized[pixelId]) {
    fbq('set', 'autoConfig', false, pixelId);
    fbq('init', pixelId);
    initialized[pixelId] = true;
  }
  return true;
};

const browserEvent = (
  attribution: MetaBrowserAttribution, name: MetaCommerceEventName | 'PageView' | 'Search' | 'Purchase',
  parameters: Record<string, unknown>, id: string
): boolean => {
  if (!initializeMetaPixel(attribution.pixelId)) return false;
  window.fbq?.('trackSingle', attribution.pixelId, name, parameters, { eventID: id });
  return true;
};

export const trackPageView = (routeKey: string): boolean => {
  const attribution = getMetaAttribution();
  if (!attribution || !routeKey) {
    lastPageView = undefined;
    suspendMetaPixel();
    return false;
  }
  const key = attribution.consentId + ':' + routeKey;
  if (key === lastPageView) return false;
  lastPageView = key;
  const id = generateEventId('page');
  browserEvent(attribution, 'PageView', {}, id);
  void mirrorMetaEvent(attribution, id, window.location.pathname, { name: 'PageView' });
  return true;
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const validId = (id: string): boolean => /^[A-Za-z0-9_-]{1,100}$/.test(id);
const commerceParameters = (input: MetaCommerceInput): MetaCommerceParameters | null => {
  const contents = input.contents.flatMap(({ id, quantity, item_price }) =>
    validId(id.trim()) && Number.isFinite(quantity) && quantity >= 1 && quantity <= 10_000 &&
    Number.isFinite(item_price) && item_price >= 0 && item_price <= 100_000_000
      ? [{ id: id.trim(), quantity: Math.floor(quantity), item_price: roundMoney(item_price) }] : []);
  if (!contents.length || contents.length > 100 || !Number.isFinite(input.value) || input.value < 0 || input.value > 100_000_000) return null;
  return {
    content_ids: [...new Set(contents.map(item => item.id))], content_type: 'product',
    contents, currency: META_CURRENCY, value: roundMoney(input.value),
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
    ...(input.content_name?.trim() ? { content_name: input.content_name.trim() } : {}),
    ...(input.content_category?.trim() ? { content_category: input.content_category.trim() } : {})
  };
};

const trackCommerce = (name: MetaCommerceEventName, input: MetaCommerceInput, id = generateEventId(name), paymentMethod?: MetaPaymentInput['payment_method']): boolean => {
  const attribution = getMetaAttribution();
  const parameters = attribution ? commerceParameters(input) : null;
  if (!attribution || !parameters) return false;
  if (paymentMethod) parameters.payment_method = paymentMethod;
  browserEvent(attribution, name, { ...parameters }, id);
  void mirrorMetaEvent(attribution, id, window.location.pathname, { name, commerce: {
    contents: parameters.contents, value: parameters.value, payment_method: paymentMethod
  } });
  return true;
};

export const trackViewContent = (input: MetaCommerceInput, id?: string): boolean => trackCommerce('ViewContent', input, id);
export const trackAddToWishlist = (input: MetaCommerceInput, id?: string): boolean => trackCommerce('AddToWishlist', input, id);
export const trackAddToCart = (input: MetaCommerceInput, id?: string): boolean => trackCommerce('AddToCart', input, id);
export const trackInitiateCheckout = (input: MetaCheckoutInput, id?: string): boolean => trackCommerce('InitiateCheckout', input, id);
export const trackAddPaymentInfo = (input: MetaPaymentInput, id?: string): boolean => trackCommerce('AddPaymentInfo', input, id, input.payment_method);

export const trackSearch = (input: MetaSearchInput, id = generateEventId('search')): boolean => {
  const attribution = getMetaAttribution();
  if (!attribution || !Number.isInteger(input.num_results) || input.num_results < 0 || input.num_results > 100_000) return false;
  const search = { content_ids: [...new Set((input.content_ids ?? []).filter(validId))].slice(0, 50), num_results: input.num_results };
  browserEvent(attribution, 'Search', search, id);
  // Search terms can include names, email addresses or other personal details.
  void mirrorMetaEvent(attribution, id, window.location.pathname, { name: 'Search', search });
  return true;
};

export const trackPurchase = (input: MetaPurchaseInput, id: string): boolean => {
  const attribution = getMetaAttribution();
  const parameters = attribution ? commerceParameters(input) : null;
  if (!attribution || !parameters || id !== metaPurchaseEventId(input.order_id)) return false;
  return browserEvent(attribution, 'Purchase', { ...parameters, order_id: input.order_id }, id);
};

export const trackCustomEvent = (name: string, properties: Record<string, string | number | boolean>): boolean => {
  const pixelId = getMetaPixelId();
  if (!name.trim() || !initializeMetaPixel(pixelId)) return false;
  window.fbq?.('trackSingleCustom', pixelId, name.trim(), properties);
  return true;
};

export const generateEventId = (namespace = 'event'): string => {
  const prefix = namespace.trim().replace(/[^a-zA-Z0-9:_-]/g, '-') || 'event';
  if (typeof globalThis.crypto?.randomUUID === 'function') return prefix + ':' + globalThis.crypto.randomUUID();
  eventCounter += 1;
  return prefix + ':' + Date.now().toString(36) + ':' + eventCounter.toString(36) + ':' + Math.random().toString(36).slice(2);
};

export const resetMetaPixelStateForTests = (): void => {
  pixelHasConsent = false;
  lastPageView = undefined;
  eventCounter = 0;
};
