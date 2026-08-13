// Governed by .rules v1.0
import crypto from 'node:crypto';
import { LogisticsWebhookEventModel } from '../../models/logistics-webhook-event.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import type { ReconcileShipmentResult, TrackingScan } from '../../types/logistics.types.js';
import { applyShiprocketSnapshot, recordShiprocketSyncFailure } from './logistics-sync.service.js';
import { normalizeShipmentStatus } from './logistics-status.js';
import { LogisticsJobService } from './logistics-job.service.js';

interface WebhookInput {
  awb?: string | number;
  awb_code?: string | number;
  order_id?: string | number;
  sr_order_id?: string | number;
  channel_order_id?: string | number;
  source_order_id?: string | number;
  shipment_id?: string | number;
  current_status?: string;
  shipment_status?: string;
  status?: string;
  status_id?: number;
  current_status_id?: number;
  shipment_status_id?: number;
  courier_name?: string;
  courier_id?: number;
  pickup_status?: string;
  pickup_scheduled_date?: string;
  etd?: string;
  scans?: Array<{ date: string; status: string; activity?: string; location?: string; status_id?: number; 'sr-status'?: number }>;
}

const value = (input: string | number | undefined): string | undefined => input === undefined ? undefined : String(input);
const safeError = (error: unknown): string => (error instanceof Error ? error.message : 'Webhook synchronization failed')
  .replace(/(token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
  .slice(0, 500);

const findShipment = async (input: { awb?: string; providerShipmentId?: string; providerOrderId?: string; sourceOrderId?: string }) => {
  if (input.awb) {
    const shipment = await ShipmentModel.findOne({ awb: input.awb });
    if (shipment) return shipment;
  }
  if (input.providerShipmentId) {
    const shipment = await ShipmentModel.findOne({ providerShipmentId: input.providerShipmentId });
    if (shipment) return shipment;
  }
  if (input.providerOrderId) {
    const shipment = await ShipmentModel.findOne({ providerOrderId: input.providerOrderId });
    if (shipment) return shipment;
  }
  return input.sourceOrderId ? ShipmentModel.findOne({ sourceOrderId: input.sourceOrderId }) : null;
};

export const LogisticsWebhookService = {
  async process(input: WebhookInput): Promise<{ accepted: true; duplicate: boolean; matched: boolean }> {
    const awb = value(input.awb_code ?? input.awb);
    const providerOrderId = value(input.sr_order_id ?? input.order_id);
    // Shiprocket's order_id is a provider identifier. Only explicit merchant-channel
    // references are trusted for the final local-order fallback.
    const sourceOrderId = value(input.channel_order_id ?? input.source_order_id);
    const providerShipmentId = value(input.shipment_id);
    const rawStatus = input.current_status ?? input.shipment_status ?? input.status ?? 'Unknown';
    const providerStatusId = input.current_status_id ?? input.shipment_status_id ?? input.status_id;
    const safePayload = {
      awb,
      providerOrderId,
      sourceOrderId,
      providerShipmentId,
      rawStatus,
      providerStatusId,
      courierName: input.courier_name,
      courierId: input.courier_id,
      pickupStatus: input.pickup_status,
      pickupDate: input.pickup_scheduled_date,
      etd: input.etd,
      scans: input.scans
    };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(safePayload)).digest('hex');
    let event;
    try {
      event = await LogisticsWebhookEventModel.create({ provider: 'shiprocket', fingerprint, eventType: rawStatus, payload: safePayload });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
        const existing = await LogisticsWebhookEventModel.findOne({ provider: 'shiprocket', fingerprint }).select('status').lean();
        return { accepted: true, duplicate: true, matched: existing?.status === 'processed' };
      }
      throw error;
    }
    const shipment = await findShipment({ awb, providerShipmentId, providerOrderId, sourceOrderId });
    if (!shipment) {
      event.status = 'ignored';
      event.processedAt = new Date();
      await event.save();
      return { accepted: true, duplicate: false, matched: false };
    }
    const scans: TrackingScan[] = (input.scans ?? []).flatMap((scan) => {
      const timestamp = new Date(scan.date);
      if (Number.isNaN(timestamp.getTime())) return [];
      const statusId = scan['sr-status'] ?? scan.status_id;
      return [{
        status: normalizeShipmentStatus(scan.status, statusId),
        rawStatus: scan.status,
        providerStatusId: statusId,
        message: scan.activity ?? scan.status,
        location: scan.location,
        timestamp: timestamp.toISOString()
      }];
    });
    const snapshot: ReconcileShipmentResult = {
      providerOrderId: shipment.providerOrderId ?? providerOrderId,
      providerShipmentId: shipment.providerShipmentId ?? providerShipmentId,
      awb,
      courierId: input.courier_id,
      courierName: input.courier_name,
      pickupStatus: input.pickup_status,
      pickupDate: input.pickup_scheduled_date,
      providerStatusId,
      status: normalizeShipmentStatus(rawStatus, providerStatusId),
      rawStatus,
      estimatedDelivery: input.etd,
      scans
    };
    try {
      await applyShiprocketSnapshot(shipment, snapshot, 'webhook');
      if (process.env.NODE_ENV !== 'test') await LogisticsJobService.enqueue('reconcile_tracking', { shipmentId: String(shipment._id) }, `webhook-reconcile:${fingerprint}`).catch(() => undefined);
      event.shipment = shipment._id;
      event.status = 'processed';
      event.processedAt = new Date();
      await event.save();
      return { accepted: true, duplicate: false, matched: true };
    } catch (error) {
      await recordShiprocketSyncFailure(String(shipment._id), 'webhook', error);
      event.shipment = shipment._id;
      event.status = 'failed';
      event.error = safeError(error);
      event.processedAt = new Date();
      await event.save();
      throw error;
    }
  }
};
