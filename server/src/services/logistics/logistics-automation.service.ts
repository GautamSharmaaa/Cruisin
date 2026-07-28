// Governed by .rules v1.0
import { logisticsConfig } from '../../config/logistics.js';
import { LogisticsJobModel } from '../../models/logistics-job.model.js';

const enqueue = async (type: 'assign_awb' | 'schedule_pickup', payload: Record<string, unknown>, dedupeKey: string): Promise<void> => {
  try {
    await LogisticsJobModel.create({ type, payload, dedupeKey });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) return;
    throw error;
  }
};

export const shouldAutoCreateProviderOrder = (
  paymentMode: 'online' | 'cod' | 'partial' | undefined,
  flags: { autoCreateOrder: boolean; autoCreateCodOrder: boolean } = logisticsConfig
): boolean => paymentMode === 'cod' ? flags.autoCreateCodOrder : flags.autoCreateOrder;

export const LogisticsAutomationService = {
  async afterProviderOrder(shipment: {
    _id: unknown;
    courierId?: number | null;
    package?: { measurementConfirmed?: boolean } | null;
  }): Promise<boolean> {
    if (!logisticsConfig.autoAssignAwb) return false;
    if (!shipment.package?.measurementConfirmed || !shipment.courierId) return false;
    const shipmentId = String(shipment._id);
    await enqueue('assign_awb', { shipmentId, courierId: shipment.courierId }, `auto-awb:${shipmentId}`);
    return true;
  },

  async afterAwb(shipment: { _id: unknown; awb?: string | null }): Promise<boolean> {
    if (!logisticsConfig.autoSchedulePickup || !shipment.awb) return false;
    const shipmentId = String(shipment._id);
    await enqueue('schedule_pickup', { shipmentId }, `auto-pickup:${shipmentId}`);
    return true;
  }
};
