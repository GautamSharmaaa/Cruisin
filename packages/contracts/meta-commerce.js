// Governed by .rules v1.0
export const META_COMMERCE_EVENTS = ['ViewContent', 'AddToWishlist', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo'];
export const META_CONSENT_VERSION = 1;
export const META_CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const META_EVENT_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const metaPurchaseEventId = (orderId) => 'purchase:' + orderId.trim();

const publicPage = /^\/(?:|(?:shop|men|women|collections|category|pages|product)(?:\/[a-z0-9_-]+){0,4}|cart|checkout(?:\/success)?|sale|new-featured|about-us|shipping-policy|return-policy|privacy-policy|terms-and-condition)\/?$/i;

// The browser and API share this allowlist. Query strings and fragments are
// never included in the server event source URL.
export const isMetaStorefrontPath = (path) =>
  typeof path === 'string' && path.length <= 256 && publicPage.test(path) && !path.startsWith('//');

export const isMetaPurchaseConfirmed = (order) => {
  if (order.isTestOrder || order.isAnalyticsTestData || ['cancelled', 'returned', 'pending'].includes(order.orderStatus ?? 'pending')) return false;
  if (order.paymentMode === 'cod') return ['cod_pending', 'cod_collected', 'paid'].includes(order.paymentStatus ?? '');
  return order.paymentStatus === 'paid' || (order.paymentMode === 'partial' && order.paymentStatus === 'partially_paid');
};
