// Governed by .rules v1.0
import crypto from 'node:crypto';
import type { HydratedDocument } from 'mongoose';
import { OrderModel } from '../../models/order.model.js';
import type { ShipmentDocument } from '../../models/shipment.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import type { ReconcileShipmentResult, ShipmentStatus, TrackingScan } from '../../types/logistics.types.js';
import { LogisticsProviderError } from '../../types/logistics.types.js';
import { LogisticsNotificationService } from './logistics-notification.service.js';
import { canApplyShipmentStatus } from './logistics-status.js';

export type ShiprocketSyncSource = 'webhook' | 'manual_sync' | 'scheduled_reconciliation';

const safeDate = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const scanFingerprint = (scan: TrackingScan): string => {
  const timestamp = safeDate(scan.timestamp)?.toISOString() ?? scan.timestamp;
  return crypto.createHash('sha256').update(`${timestamp}|${scan.rawStatus}|${scan.location ?? ''}|${scan.message}`).digest('hex');
};

const safeProviderError = (error: unknown): { code: string; message: string; retryable: boolean; correlationId?: string } => {
  const provider = error instanceof LogisticsProviderError ? error : undefined;
  return {
    code: provider?.code ?? 'unknown',
    message: (error instanceof Error ? error.message : 'Shiprocket synchronization failed')
      .replace(/(token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
      .slice(0, 500),
    retryable: provider?.retryable ?? false,
    correlationId: provider?.providerReference
  };
};

const notificationEventForStatus = (status: ShipmentStatus) => {
  if (['picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'ndr'].includes(status)) return status as 'picked_up' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr';
  if (status === 'rto_initiated' || status === 'rto_in_transit') return 'rto_initiated' as const;
  if (status === 'rto_delivered') return 'rto_delivered' as const;
  return null;
};

const reconcileOrderFulfilment = async (orderId: unknown, status: ShipmentStatus): Promise<void> => {
  if (status === 'delivered') {
    await OrderModel.updateOne(
      { _id: orderId, orderStatus: { $nin: ['cancelled', 'returned'] } },
      { $set: { fulfillmentStatus: 'fulfilled', orderStatus: 'delivered' } }
    );
    return;
  }
  if (['picked_up', 'shipped', 'in_transit', 'reached_destination_hub', 'out_for_delivery'].includes(status)) {
    await OrderModel.updateOne(
      { _id: orderId, orderStatus: { $in: ['pending', 'placed', 'confirmed', 'processing', 'shipped'] } },
      { $set: { fulfillmentStatus: 'partially_fulfilled', orderStatus: 'shipped' } }
    );
    return;
  }
  if (status === 'cancelled') {
    await OrderModel.updateOne({ _id: orderId }, { $set: { fulfillmentStatus: 'cancelled' } });
    return;
  }
  if (status === 'rto_delivered') {
    await OrderModel.updateOne({ _id: orderId }, { $set: { fulfillmentStatus: 'returned' } });
    return;
  }
  if (status === 'lost' || status === 'damaged') {
    await OrderModel.updateOne({ _id: orderId }, { $set: { fulfillmentStatus: 'logistics_error' } });
  }
};

const assertIdentifierIntegrity = (current: string | null | undefined, incoming: string | undefined, label: string): void => {
  if (current && incoming && current !== incoming) {
    throw new LogisticsProviderError('invalid_payload', `Shiprocket returned a conflicting ${label}`, false, 409);
  }
};

export const applyShiprocketSnapshot = async (
  shipment: HydratedDocument<ShipmentDocument>,
  snapshot: ReconcileShipmentResult,
  source: ShiprocketSyncSource
): Promise<{ shipment: HydratedDocument<ShipmentDocument>; changed: boolean; statusChanged: boolean; scansAdded: number }> => {
  const now = new Date();
  const previousStatus = shipment.shipmentStatus as ShipmentStatus;
  let changed = false;
  let scansAdded = 0;
  assertIdentifierIntegrity(shipment.providerOrderId, snapshot.providerOrderId, 'order ID');
  assertIdentifierIntegrity(shipment.providerShipmentId, snapshot.providerShipmentId, 'shipment ID');
  assertIdentifierIntegrity(shipment.awb, snapshot.awb, 'AWB');
  const assign = <T>(current: T, incoming: T | undefined, setter: (value: T) => void): void => {
    if (incoming === undefined || incoming === null || incoming === current) return;
    setter(incoming);
    changed = true;
  };
  assign(shipment.providerOrderId ?? undefined, snapshot.providerOrderId, (value) => { shipment.providerOrderId = value as string; });
  assign(shipment.providerShipmentId ?? undefined, snapshot.providerShipmentId, (value) => { shipment.providerShipmentId = value as string; });
  assign(shipment.awb ?? undefined, snapshot.awb, (value) => { shipment.awb = value as string; });
  assign(shipment.courierId ?? undefined, snapshot.courierId, (value) => { shipment.courierId = value as number; });
  assign(shipment.courierName ?? undefined, snapshot.courierName, (value) => { shipment.courierName = value as string; });
  assign(shipment.pickupStatus ?? undefined, snapshot.pickupStatus, (value) => { shipment.pickupStatus = value as string; });
  assign(shipment.providerStatusId ?? undefined, snapshot.providerStatusId, (value) => { shipment.providerStatusId = value as number; });
  assign(shipment.rawProviderStatus ?? undefined, snapshot.rawStatus, (value) => { shipment.rawProviderStatus = value as string; });
  const pickupDate = safeDate(snapshot.pickupDate);
  if (pickupDate && shipment.pickupDate?.getTime() !== pickupDate.getTime()) {
    shipment.pickupDate = pickupDate;
    changed = true;
  }
  const estimatedDelivery = safeDate(snapshot.estimatedDelivery);
  if (estimatedDelivery && shipment.estimatedDelivery?.getTime() !== estimatedDelivery.getTime()) {
    shipment.estimatedDelivery = estimatedDelivery;
    changed = true;
  }
  if (canApplyShipmentStatus(previousStatus, snapshot.status)) {
    shipment.shipmentStatus = snapshot.status;
    changed = true;
  }
  const existing = new Set(shipment.trackingScans.map((scan) => scan.fingerprint));
  for (const scan of snapshot.scans) {
    const timestamp = safeDate(scan.timestamp);
    if (!timestamp) continue;
    const fingerprint = scanFingerprint(scan);
    if (existing.has(fingerprint)) continue;
    shipment.trackingScans.push({ ...scan, fingerprint, timestamp });
    existing.add(fingerprint);
    scansAdded += 1;
    changed = true;
  }
  shipment.trackingScans.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  if (shipment.trackingScans.length > 200) shipment.trackingScans.splice(0, shipment.trackingScans.length - 200);
  const latestTracking = shipment.trackingScans.at(-1)?.timestamp;
  if (latestTracking) shipment.lastTrackingUpdate = latestTracking;
  const currentStatus = shipment.shipmentStatus as ShipmentStatus;
  const statusChanged = previousStatus !== currentStatus;
  if (currentStatus === 'delivered') shipment.deliveredDate ??= latestTracking ?? now;
  if (statusChanged && currentStatus === 'ndr' && shipment.ndr) {
    shipment.ndr.occurredAt ??= latestTracking ?? now;
    shipment.ndr.reason = snapshot.scans.at(-1)?.message ?? 'Delivery attempt failed';
    shipment.ndr.attemptCount += 1;
  }
  if (currentStatus.startsWith('rto_') && shipment.rto) {
    shipment.rto.initiatedAt ??= latestTracking ?? now;
    shipment.rto.status = currentStatus === 'rto_delivered' ? 'delivered' : currentStatus === 'rto_in_transit' ? 'in_transit' : 'initiated';
  }
  shipment.lastSyncAttemptAt = now;
  shipment.lastSuccessfulSyncAt = now;
  shipment.lastSyncAt = now;
  shipment.lastSyncSource = source;
  shipment.syncErrorCode = undefined;
  shipment.lastProviderError = undefined;
  if (source === 'webhook') shipment.lastWebhookAt = now;
  await shipment.save();
  if (statusChanged) await reconcileOrderFulfilment(shipment.order, currentStatus);
  const eventType = statusChanged ? notificationEventForStatus(currentStatus) : null;
  if (eventType) {
    await LogisticsNotificationService.emit({
      eventType,
      orderId: String(shipment.order),
      shipmentId: String(shipment._id),
      entityReference: shipment.rawProviderStatus ?? undefined,
      source: source === 'webhook' ? 'webhook' : source === 'scheduled_reconciliation' ? 'job' : 'service'
    });
  }
  return { shipment, changed, statusChanged, scansAdded };
};

export const recordShiprocketSyncFailure = async (shipmentId: string, source: ShiprocketSyncSource, error: unknown): Promise<void> => {
  const safe = safeProviderError(error);
  const now = new Date();
  await ShipmentModel.updateOne({ _id: shipmentId }, {
    $set: {
      lastSyncAttemptAt: now,
      lastSyncSource: source,
      syncErrorCode: safe.code,
      lastProviderError: { ...safe, occurredAt: now }
    }
  });
};
