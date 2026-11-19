// Governed by .rules v1.0
export const META_COMMERCE_EVENTS: readonly ['ViewContent', 'AddToWishlist', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo'];
export type MetaCommerceEventName = typeof META_COMMERCE_EVENTS[number];
export type MetaBrowserEventName = MetaCommerceEventName | 'PageView' | 'Search';
export const META_CONSENT_VERSION: 1;
export const META_CONSENT_LIFETIME_MS: number;
export const META_EVENT_LIFETIME_MS: number;

export interface MetaBrowserAttribution {
  pixelId: string;
  consentId: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaPurchaseReceipt {
  eventId: string;
  pixelId: string;
  confirmedAt: string;
}

export function metaPurchaseEventId(orderId: string): string;
export function isMetaStorefrontPath(path: unknown): path is string;
export function isMetaPurchaseConfirmed(order: {
  orderStatus?: string | null;
  paymentMode?: string | null;
  paymentStatus?: string | null;
  isTestOrder?: boolean | null;
  isAnalyticsTestData?: boolean | null;
}): boolean;
