// Governed by .rules v1.0
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type { Request } from 'express';
import {
  META_CONSENT_VERSION, META_EVENT_LIFETIME_MS, metaPurchaseEventId, type MetaBrowserAttribution
} from '@cruisin/contracts/meta-commerce';
import { env } from '../config/env.js';
import { storefrontBrowserOrigins } from '../config/origins.js';
import { MetaConsentModel, type MetaCustomerSignals } from '../models/meta-conversion.model.js';

export interface MetaOrderAttribution {
  pixelId: string;
  consentRef: string;
  expiresAt: Date;
  clientUserAgent: string;
  clientIp?: string;
  fbp?: string;
  fbc?: string;
}

export const canQueueMeta = (): boolean => env.META_CAPI_ENABLED && Boolean(env.META_PIXEL_ID);

export const isStorefrontMetaRequest = (req: Request): boolean =>
  storefrontBrowserOrigins.includes(req.get('origin') ?? '');

export const browserOptsOut = (req: Request): boolean =>
  req.get('sec-gpc') === '1' || req.get('dnt') === '1';

export const metaConsentRef = (pixelId: string, consentId: string): string =>
  createHash('sha256').update(pixelId + ':' + consentId.toLowerCase()).digest('hex');

export const isMetaConsentActive = async (ref: string, pixelId: string, now = new Date()): Promise<boolean> =>
  Boolean(await MetaConsentModel.exists({
    _id: ref, pixelId, version: META_CONSENT_VERSION, grantedAt: { $exists: true },
    revokedAt: { $exists: false }, expiresAt: { $gt: now }
  }).maxTimeMS(500));

export const metaRequestSignals = (req: Request, { fbp, fbc }: MetaBrowserAttribution): MetaCustomerSignals | undefined => {
  const userAgent = req.get('user-agent')?.trim().slice(0, 512);
  if (!userAgent) return undefined;
  const ip = req.ip?.replace(/^::ffff:/i, '');
  return {
    client_user_agent: userAgent,
    ...(ip && isIP(ip) ? { client_ip_address: ip } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {})
  };
};

export const captureMetaCheckout = async (req: Request, attribution?: MetaBrowserAttribution): Promise<MetaOrderAttribution | undefined> => {
  if (!attribution || attribution.pixelId !== env.META_PIXEL_ID || req.user?.role !== 'customer' ||
      req.user.assisted || !isStorefrontMetaRequest(req) || browserOptsOut(req)) return undefined;

  const signals = metaRequestSignals(req, attribution);
  if (!signals) return undefined;
  const consentRef = metaConsentRef(attribution.pixelId, attribution.consentId);
  // A telemetry lookup failure must leave checkout available.
  if (!await isMetaConsentActive(consentRef, attribution.pixelId).catch(() => false)) return undefined;
  return {
    pixelId: attribution.pixelId,
    consentRef,
    expiresAt: new Date(Date.now() + META_EVENT_LIFETIME_MS),
    clientUserAgent: signals.client_user_agent,
    clientIp: signals.client_ip_address,
    fbp: signals.fbp,
    fbc: signals.fbc
  };
};

export const metaPurchaseReceipt = (orderId: string, attribution?: Pick<MetaOrderAttribution, 'pixelId' | 'expiresAt'> | null, now = new Date()) => {
  if (!attribution || attribution.pixelId !== env.META_PIXEL_ID || attribution.expiresAt <= now) return undefined;
  return { eventId: metaPurchaseEventId(orderId), pixelId: attribution.pixelId, confirmedAt: now };
};
