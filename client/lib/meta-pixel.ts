// Governed by .rules v1.0

export const META_CURRENCY = 'INR' as const;

export interface MetaContentInput {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaCommerceInput {
  contents: MetaContentInput[];
  value: number;
  content_name?: string;
  content_category?: string;
}

export interface MetaSearchInput {
  search_string: string;
  content_ids?: string[];
  num_results?: number;
}

export interface MetaCheckoutInput extends MetaCommerceInput {
  num_items?: number;
  coupon?: string;
}

export interface MetaPaymentInput extends MetaCheckoutInput {
  payment_method: 'cod' | 'online' | 'online_partial';
}

export interface MetaPurchaseInput extends MetaCheckoutInput {
  order_id: string;
}

export interface MetaEventOptions {
  eventID?: string;
}

export interface MetaCommerceParameters {
  content_ids: string[];
  content_type: 'product';
  contents: MetaContentInput[];
  currency: typeof META_CURRENCY;
  value: number;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  coupon?: string;
  payment_method?: MetaPaymentInput['payment_method'];
  order_id?: string;
}

export interface MetaSearchParameters {
  search_string: string;
  content_ids?: string[];
  num_results?: number;
}

export type MetaStandardEventName = 'PageView' | 'ViewContent' | 'Search' | 'AddToWishlist' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase';

export interface MetaFbq {
  (command: 'init', pixelId: string): void;
  (command: 'track', eventName: 'PageView'): void;
  (command: 'track', eventName: 'Search', parameters: MetaSearchParameters, options?: MetaEventOptions): void;
  (command: 'track', eventName: Exclude<MetaStandardEventName, 'PageView' | 'Search'>, parameters: MetaCommerceParameters, options?: MetaEventOptions): void;
  (command: 'trackSingle', pixelId: string, eventName: 'PageView'): void;
  (command: 'trackSingle', pixelId: string, eventName: 'Search', parameters: MetaSearchParameters, options?: MetaEventOptions): void;
  (command: 'trackSingle', pixelId: string, eventName: Exclude<MetaStandardEventName, 'PageView' | 'Search'>, parameters: MetaCommerceParameters, options?: MetaEventOptions): void;
  (command: 'trackCustom', eventName: string, parameters?: Record<string, string | number | boolean>): void;
  (command: 'trackSingleCustom', pixelId: string, eventName: string, parameters?: Record<string, string | number | boolean>): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
    __cruisinMetaPixelIds?: Record<string, true>;
  }
}

let missingPixelWarningIssued = false;
let lastPageViewRoute: string | undefined;
let eventCounter = 0;

const isBrowser = (): boolean => typeof window !== 'undefined';
const isDevelopment = (): boolean => process.env.NODE_ENV !== 'production';
const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const cleanId = (value: string): string => value.trim();
const markDispatch = (eventName: MetaStandardEventName | 'Init', status: string): void => {
  if (!isBrowser() || typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-cruisin-meta-last-event', eventName);
  document.documentElement.setAttribute('data-cruisin-meta-last-status', status);
};
const dispatchStatus = (): string => window.fbq?.callMethod ? 'sent-ready' : 'queued-awaiting-library';

const warnMissingPixelOnce = (): void => {
  if (!isDevelopment() || missingPixelWarningIssued) return;
  missingPixelWarningIssued = true;
  console.warn('Meta Pixel is disabled because NEXT_PUBLIC_META_PIXEL_ID is not configured.');
};

export const getMetaPixelId = (): string => process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? '';

export const initializeMetaPixel = (pixelId = getMetaPixelId()): boolean => {
  if (!isBrowser()) return false;
  const normalizedPixelId = pixelId.trim();
  if (!normalizedPixelId) {
    markDispatch('Init', 'blocked-missing-pixel-id');
    warnMissingPixelOnce();
    return false;
  }
  if (!window.fbq) {
    markDispatch('Init', 'blocked-fbq-unavailable');
    return false;
  }
  const initialized = window.__cruisinMetaPixelIds ??= {};
  if (!initialized[normalizedPixelId]) {
    window.fbq('init', normalizedPixelId);
    initialized[normalizedPixelId] = true;
  }
  markDispatch('Init', dispatchStatus());
  return true;
};

const eventOptions = (eventID?: string): MetaEventOptions | undefined => {
  const normalized = eventID?.trim();
  return normalized ? { eventID: normalized } : undefined;
};

const configuredPixelId = (): string | undefined => getMetaPixelId() || undefined;

const validContents = (contents: MetaContentInput[]): MetaContentInput[] => contents.flatMap((content) => {
  const id = cleanId(content.id);
  const quantity = Math.floor(content.quantity);
  const itemPrice = roundMoney(content.item_price);
  if (!id || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(itemPrice) || itemPrice < 0) return [];
  return [{ id, quantity, item_price: itemPrice }];
});

const commerceParameters = (input: MetaCommerceInput): MetaCommerceParameters | null => {
  const contents = validContents(input.contents);
  const value = roundMoney(input.value);
  if (contents.length === 0 || !Number.isFinite(value) || value < 0) return null;
  const contentName = input.content_name?.trim();
  const contentCategory = input.content_category?.trim();
  return {
    content_ids: contents.map((content) => content.id),
    content_type: 'product',
    contents,
    currency: META_CURRENCY,
    value,
    ...(contentName ? { content_name: contentName } : {}),
    ...(contentCategory ? { content_category: contentCategory } : {})
  };
};

const sendCommerceEvent = (
  eventName: Exclude<MetaStandardEventName, 'PageView' | 'Search'>,
  parameters: MetaCommerceParameters | null,
  eventID?: string
): boolean => {
  if (!isBrowser()) return false;
  if (!window.fbq) {
    markDispatch(eventName, 'blocked-fbq-unavailable');
    return false;
  }
  if (!parameters) {
    markDispatch(eventName, 'blocked-invalid-payload');
    return false;
  }
  const options = eventOptions(eventID);
  const pixelId = configuredPixelId();
  if (pixelId) {
    if (options) window.fbq('trackSingle', pixelId, eventName, parameters, options);
    else window.fbq('trackSingle', pixelId, eventName, parameters);
  } else if (options) window.fbq('track', eventName, parameters, options);
  else window.fbq('track', eventName, parameters);
  markDispatch(eventName, dispatchStatus());
  return true;
};

export const trackPageView = (routeKey: string): boolean => {
  if (!isBrowser()) return false;
  if (!window.fbq) {
    markDispatch('PageView', 'blocked-fbq-unavailable');
    return false;
  }
  const normalizedRoute = routeKey.trim();
  if (!normalizedRoute || normalizedRoute === lastPageViewRoute) {
    markDispatch('PageView', 'blocked-duplicate-or-empty-route');
    return false;
  }
  const pixelId = configuredPixelId();
  if (pixelId) window.fbq('trackSingle', pixelId, 'PageView');
  else window.fbq('track', 'PageView');
  lastPageViewRoute = normalizedRoute;
  markDispatch('PageView', dispatchStatus());
  return true;
};

export const trackViewContent = (input: MetaCommerceInput, eventID?: string): boolean => sendCommerceEvent('ViewContent', commerceParameters(input), eventID);

export const trackSearch = (input: MetaSearchInput, eventID?: string): boolean => {
  if (!isBrowser()) return false;
  if (!window.fbq) {
    markDispatch('Search', 'blocked-fbq-unavailable');
    return false;
  }
  const searchString = input.search_string.trim();
  if (!searchString) {
    markDispatch('Search', 'blocked-invalid-payload');
    return false;
  }
  const ids = Array.from(new Set((input.content_ids ?? []).map(cleanId).filter(Boolean)));
  const resultCount = typeof input.num_results === 'number' && Number.isFinite(input.num_results) && input.num_results >= 0 ? Math.floor(input.num_results) : undefined;
  const parameters: MetaSearchParameters = {
    search_string: searchString,
    ...(ids.length > 0 ? { content_ids: ids } : {}),
    ...(resultCount !== undefined ? { num_results: resultCount } : {})
  };
  const options = eventOptions(eventID);
  const pixelId = configuredPixelId();
  if (pixelId) {
    if (options) window.fbq('trackSingle', pixelId, 'Search', parameters, options);
    else window.fbq('trackSingle', pixelId, 'Search', parameters);
  } else if (options) window.fbq('track', 'Search', parameters, options);
  else window.fbq('track', 'Search', parameters);
  markDispatch('Search', dispatchStatus());
  return true;
};

export const trackAddToWishlist = (input: MetaCommerceInput, eventID?: string): boolean => sendCommerceEvent('AddToWishlist', commerceParameters(input), eventID);

export const trackAddToCart = (input: MetaCommerceInput, eventID?: string): boolean => sendCommerceEvent('AddToCart', commerceParameters(input), eventID);

export const trackInitiateCheckout = (input: MetaCheckoutInput, eventID?: string): boolean => {
  const parameters = commerceParameters(input);
  if (!parameters) return false;
  const numItems = input.num_items ?? parameters.contents.reduce((sum, content) => sum + content.quantity, 0);
  if (!Number.isFinite(numItems) || numItems <= 0) return false;
  parameters.num_items = Math.floor(numItems);
  const coupon = input.coupon?.trim();
  if (coupon) parameters.coupon = coupon;
  return sendCommerceEvent('InitiateCheckout', parameters, eventID);
};

export const trackAddPaymentInfo = (input: MetaPaymentInput, eventID?: string): boolean => {
  const parameters = commerceParameters(input);
  if (!parameters) return false;
  const numItems = input.num_items ?? parameters.contents.reduce((sum, content) => sum + content.quantity, 0);
  if (!Number.isFinite(numItems) || numItems <= 0) return false;
  parameters.num_items = Math.floor(numItems);
  parameters.payment_method = input.payment_method;
  return sendCommerceEvent('AddPaymentInfo', parameters, eventID);
};

export const trackPurchase = (input: MetaPurchaseInput, eventID?: string): boolean => {
  const orderId = cleanId(input.order_id);
  const parameters = commerceParameters(input);
  if (!orderId || !parameters) return false;
  const numItems = input.num_items ?? parameters.contents.reduce((sum, content) => sum + content.quantity, 0);
  if (!Number.isFinite(numItems) || numItems <= 0) return false;
  parameters.num_items = Math.floor(numItems);
  parameters.order_id = orderId;
  const coupon = input.coupon?.trim();
  if (coupon) parameters.coupon = coupon;
  return sendCommerceEvent('Purchase', parameters, eventID);
};

export const trackCustomEvent = (eventName: string, properties: Record<string, string | number | boolean>): boolean => {
  if (!isBrowser() || !window.fbq) return false;
  const normalizedName = eventName.trim();
  if (!normalizedName) return false;
  const pixelId = configuredPixelId();
  if (pixelId) window.fbq('trackSingleCustom', pixelId, normalizedName, properties);
  else window.fbq('trackCustom', normalizedName, properties);
  return true;
};

export const generateEventId = (namespace = 'event'): string => {
  const prefix = namespace.trim().replace(/[^a-zA-Z0-9:_-]/g, '-') || 'event';
  if (typeof globalThis.crypto?.randomUUID === 'function') return `${prefix}:${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint32Array(4);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return `${prefix}:${Array.from(bytes, (value) => value.toString(16).padStart(8, '0')).join('')}`;
  }
  eventCounter += 1;
  return `${prefix}:${Date.now().toString(36)}:${eventCounter.toString(36)}:${Math.random().toString(36).slice(2)}`;
};

export const purchaseEventId = (orderId: string): string => `purchase:${cleanId(orderId)}`;

export const resetMetaPixelStateForTests = (): void => {
  missingPixelWarningIssued = false;
  lastPageViewRoute = undefined;
  eventCounter = 0;
};
