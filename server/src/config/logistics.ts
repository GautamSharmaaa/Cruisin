// Governed by .rules v1.0
import { env } from './env.js';
import { ApiError } from '../utils/api-error.js';

export type ShiprocketMode = 'mock' | 'live-readonly' | 'live';

export const logisticsConfig = {
  provider: env.LOGISTICS_PROVIDER,
  enabled: env.SHIPROCKET_ENABLED,
  mode: env.SHIPROCKET_MODE,
  liveMutationsAllowed: env.SHIPROCKET_ALLOW_LIVE_MUTATIONS,
  baseUrl: env.SHIPROCKET_BASE_URL,
  apiEmail: env.SHIPROCKET_API_EMAIL,
  apiPassword: env.SHIPROCKET_API_PASSWORD,
  pickupLocation: env.SHIPROCKET_PICKUP_LOCATION,
  pickupPostcode: env.SHIPROCKET_PICKUP_POSTCODE,
  webhookSecret: env.SHIPROCKET_WEBHOOK_SECRET,
  requestTimeoutMs: env.SHIPROCKET_REQUEST_TIMEOUT_MS,
  tokenRefreshBufferSeconds: env.SHIPROCKET_TOKEN_REFRESH_BUFFER_SECONDS,
  autoCreateOrder: env.SHIPROCKET_AUTO_CREATE_ORDER,
  autoCreateCodOrder: env.SHIPROCKET_AUTO_CREATE_COD_ORDER,
  autoAssignAwb: env.SHIPROCKET_AUTO_ASSIGN_AWB,
  autoSchedulePickup: env.SHIPROCKET_AUTO_SCHEDULE_PICKUP,
  liveDocumentsAllowed: env.SHIPROCKET_ALLOW_LIVE_DOCUMENTS,
  notificationsEnabled: env.LOGISTICS_NOTIFICATIONS_ENABLED,
  emailNotificationsEnabled: env.LOGISTICS_EMAIL_NOTIFICATIONS_ENABLED,
  smsNotificationsEnabled: env.LOGISTICS_SMS_NOTIFICATIONS_ENABLED,
  whatsappNotificationsEnabled: env.LOGISTICS_WHATSAPP_NOTIFICATIONS_ENABLED,
  documentTtlSeconds: env.LOGISTICS_DOCUMENT_TTL_SECONDS,
  quoteTtlSeconds: env.LOGISTICS_QUOTE_TTL_SECONDS,
  packagingWeightKg: env.LOGISTICS_PACKAGING_WEIGHT_KG,
  customerFreeShipping: env.LOGISTICS_CUSTOMER_FREE_SHIPPING,
  workerEnabled: env.LOGISTICS_WORKER_ENABLED,
  workerPollMs: env.LOGISTICS_WORKER_POLL_MS
} as const;

export const assertLiveReadAllowed = (): void => {
  if (logisticsConfig.mode === 'mock') return;
  if (!env.SHIPROCKET_ALLOW_LIVE_READS) throw new ApiError(503, 'Live logistics reads are disabled');
};

export const assertLiveMutationAllowed = (): void => {
  if (logisticsConfig.mode === 'mock') return;
  if (logisticsConfig.mode !== 'live' || !env.SHIPROCKET_ALLOW_LIVE_MUTATIONS) {
    throw new ApiError(503, 'Live logistics mutations are disabled');
  }
};

export const assertLiveDocumentAllowed = (): void => {
  if (logisticsConfig.mode === 'mock') return;
  assertLiveReadAllowed();
  if (!logisticsConfig.liveDocumentsAllowed && !logisticsConfig.liveMutationsAllowed) {
    throw new ApiError(503, 'Live logistics document generation is disabled');
  }
};

export const logisticsIsMock = (): boolean => logisticsConfig.mode === 'mock';
