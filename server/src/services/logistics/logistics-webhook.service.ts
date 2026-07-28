// Governed by .rules v1.0
import crypto from 'node:crypto';
import { LogisticsWebhookEventModel } from '../../models/logistics-webhook-event.model.js';
import { OrderModel } from '../../models/order.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import type { ShipmentStatus } from '../../types/logistics.types.js';
import type { LogisticsNotificationEventType } from '../../models/logistics-notification-event.model.js';
import { LogisticsNotificationService } from './logistics-notification.service.js';
import { canApplyShipmentStatus, normalizeShipmentStatus } from './logistics-status.js';

interface WebhookInput {
  awb?: string | number;
  awb_code?: string | number;
  order_id?: string | number;
  shipment_id?: string | number;
  current_status?: string;
  status?: string;
  status_id?: number;
  etd?: string;
  scans?: Array<{ date: string; status: string; activity?: string; location?: string }>;
}

const value = (input: string | number | undefined): string | undefined => input === undefined ? undefined : String(input);
const scanFingerprint = (scan: { date: string; status: string; activity?: string; location?: string }): string => crypto.createHash('sha256').update(`${scan.date}|${scan.status}|${scan.activity ?? ''}|${scan.location ?? ''}`).digest('hex');

export const LogisticsWebhookService = {
  async process(input: WebhookInput): Promise<{ accepted: true; duplicate: boolean; matched: boolean }> {
    const awb = value(input.awb_code ?? input.awb);
    const providerOrderId = value(input.order_id);
    const providerShipmentId = value(input.shipment_id);
    const rawStatus = input.current_status ?? input.status ?? 'Unknown';
    const safePayload = { awb, providerOrderId, providerShipmentId, rawStatus, statusId: input.status_id, etd: input.etd, scans: input.scans };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(safePayload)).digest('hex');
    let event;
    try {
      event = await LogisticsWebhookEventModel.create({ provider: 'shiprocket', fingerprint, eventType: rawStatus, payload: safePayload });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) return { accepted: true, duplicate: true, matched: true };
      throw error;
    }
    const clauses: Array<Record<string, string>> = [];
    if (awb) clauses.push({ awb });
    if (providerShipmentId) clauses.push({ providerShipmentId });
    if (providerOrderId) clauses.push({ providerOrderId });
    const shipment = clauses.length ? await ShipmentModel.findOne({ $or: clauses }) : null;
    if (!shipment) {
      event.status = 'ignored';
      event.processedAt = new Date();
      await event.save();
      return { accepted: true, duplicate: false, matched: false };
    }
    const normalized = normalizeShipmentStatus(rawStatus);
    const previousStatus = shipment.shipmentStatus as ShipmentStatus;
    if (canApplyShipmentStatus(shipment.shipmentStatus as ShipmentStatus, normalized)) shipment.shipmentStatus = normalized;
    shipment.rawProviderStatus = rawStatus;
    shipment.providerStatusId = input.status_id;
    shipment.lastTrackingUpdate = new Date();
    if (input.etd) shipment.estimatedDelivery = new Date(input.etd);
    const existing = new Set(shipment.trackingScans.map((scan) => scan.fingerprint));
    for (const scan of input.scans ?? []) {
      const fingerprintValue = scanFingerprint(scan);
      if (existing.has(fingerprintValue)) continue;
      shipment.trackingScans.push({
        fingerprint: fingerprintValue,
        status: normalizeShipmentStatus(scan.status),
        rawStatus: scan.status,
        message: scan.activity ?? scan.status,
        location: scan.location,
        timestamp: new Date(scan.date)
      });
      existing.add(fingerprintValue);
    }
    if (shipment.trackingScans.length > 200) shipment.trackingScans.splice(0, shipment.trackingScans.length - 200);
    if (shipment.shipmentStatus === 'delivered') {
      shipment.deliveredDate ??= new Date();
      await OrderModel.updateOne({ _id: shipment.order }, { $set: { fulfillmentStatus: 'fulfilled', orderStatus: 'delivered' } });
    } else if (shipment.shipmentStatus === 'ndr' && shipment.ndr) {
      shipment.ndr.occurredAt ??= new Date();
      shipment.ndr.reason = input.scans?.at(-1)?.activity ?? 'Delivery attempt failed';
      shipment.ndr.attemptCount += 1;
    } else if (shipment.shipmentStatus.startsWith('rto_') && shipment.rto) {
      shipment.rto.initiatedAt ??= new Date();
      shipment.rto.status = shipment.shipmentStatus === 'rto_delivered' ? 'delivered' : shipment.shipmentStatus === 'rto_in_transit' ? 'in_transit' : 'initiated';
    }
    await shipment.save();
    event.shipment = shipment._id;
    event.status = 'processed';
    event.processedAt = new Date();
    await event.save();
    const eventByStatus: Partial<Record<ShipmentStatus, LogisticsNotificationEventType>> = {
      picked_up: 'picked_up',
      shipped: 'shipped',
      in_transit: 'in_transit',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      ndr: 'ndr',
      rto_initiated: 'rto_initiated',
      rto_in_transit: 'rto_initiated',
      rto_delivered: 'rto_delivered'
    };
    const notificationEvent = previousStatus !== shipment.shipmentStatus ? eventByStatus[shipment.shipmentStatus as ShipmentStatus] : undefined;
    if (notificationEvent) {
      await LogisticsNotificationService.emit({
        eventType: notificationEvent,
        orderId: String(shipment.order),
        shipmentId: String(shipment._id),
        entityReference: rawStatus,
        source: 'webhook'
      });
    }
    return { accepted: true, duplicate: false, matched: true };
  }
};
