// Governed by .rules v1.0
import { META_CONSENT_VERSION, type MetaBrowserAttribution, type MetaCommerceEventName } from '@cruisin/contracts/meta-commerce';
import { api } from '@/lib/api';
import { acknowledgeMetaRevocation, getMarketingConsentId, getMarketingConsentSource, getMetaPixelId, getPendingMetaRevocations } from '@/lib/meta-consent';
import type { ApiEnvelope } from '@/types/api.types';

type MetaPaymentCategory = 'cod' | 'online' | 'online_partial';

type MetaBrowserPayload =
  | { name: 'PageView' }
  | { name: 'Search'; search: { content_ids: string[]; num_results: number } }
  | { name: MetaCommerceEventName; commerce: {
    contents: Array<{ id: string; quantity: number; item_price: number }>;
    value: number;
    payment_method?: MetaPaymentCategory;
  } };

let active: { key: string; result: Promise<boolean> } | undefined;
const revoking = new Set<string>();

export const syncMetaConsent = ({ pixelId, consentId }: MetaBrowserAttribution): Promise<boolean> => {
  const key = pixelId + ':' + consentId;
  if (active?.key === key) return active.result;
  const result = api.post<ApiEnvelope<{ granted: boolean; capiEnabled: boolean }>>('/meta/consent',
    { pixelId, consentId, version: META_CONSENT_VERSION, granted: true, source: getMarketingConsentSource(consentId) }, { timeout: 3_000 })
    .then(response => response.data.data.granted && response.data.data.capiEnabled)
    .catch(() => {
      if (active?.key === key) active = undefined;
      return false;
    });
  active = { key, result };
  return result;
};

export const syncMetaRevocations = (): void => {
  const pixelId = getMetaPixelId();
  if (!pixelId) return;
  for (const consentId of getPendingMetaRevocations()) {
    if (revoking.has(consentId)) continue;
    revoking.add(consentId);
    void api.post('/meta/consent', { pixelId, consentId, version: META_CONSENT_VERSION, granted: false }, { timeout: 3_000 })
      .then(() => acknowledgeMetaRevocation(consentId))
      .catch(() => undefined)
      .finally(() => revoking.delete(consentId));
  }
};

export async function mirrorMetaEvent(attribution: MetaBrowserAttribution, eventId: string, path: string, payload: MetaBrowserPayload): Promise<void> {
  if (!await syncMetaConsent(attribution) || getMarketingConsentId() !== attribution.consentId) return;
  try { await api.post('/meta/events', { ...attribution, ...payload, eventId, path }, { timeout: 4_000 }); }
  catch { /* Analytics must remain independent of the storefront action. */ }
}
