// Governed by .rules v1.0
import type { ShipmentStatus } from '../../types/logistics.types.js';

const exactStatusMap: Record<string, ShipmentStatus> = {
  new: 'provider_order_created',
  'awb assigned': 'awb_assigned',
  'pickup scheduled': 'pickup_scheduled',
  'pickup queued': 'pickup_scheduled',
  'picked up': 'picked_up',
  shipped: 'shipped',
  'in transit': 'in_transit',
  'reached at destination': 'reached_destination_hub',
  'reached destination hub': 'reached_destination_hub',
  'out for delivery': 'out_for_delivery',
  delivered: 'delivered',
  ndr: 'ndr',
  'undelivered': 'ndr',
  'rto initiated': 'rto_initiated',
  'rto in transit': 'rto_in_transit',
  'rto delivered': 'rto_delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  'return in transit': 'return_in_transit',
  returned: 'returned'
};

export const normalizeShipmentStatus = (rawStatus: string): ShipmentStatus => {
  const normalized = rawStatus.trim().toLowerCase().replace(/\s+/g, ' ');
  if (exactStatusMap[normalized]) return exactStatusMap[normalized];
  if (normalized.includes('out for delivery')) return 'out_for_delivery';
  if (normalized.includes('delivered') && normalized.includes('rto')) return 'rto_delivered';
  if (normalized.includes('rto') && normalized.includes('transit')) return 'rto_in_transit';
  if (normalized.includes('rto')) return 'rto_initiated';
  if (normalized.includes('ndr') || normalized.includes('undelivered')) return 'ndr';
  if (normalized.includes('destination')) return 'reached_destination_hub';
  if (normalized.includes('transit')) return 'in_transit';
  if (normalized.includes('pickup')) return normalized.includes('scheduled') ? 'pickup_scheduled' : 'picked_up';
  if (normalized.includes('ship')) return 'shipped';
  if (normalized.includes('cancel')) return 'cancelled';
  return 'unknown';
};

const statusRank: Record<ShipmentStatus, number> = {
  draft: 0,
  pending_provider: 1,
  provider_order_created: 2,
  awb_assigned: 3,
  pickup_scheduled: 4,
  picked_up: 5,
  shipped: 6,
  in_transit: 7,
  reached_destination_hub: 8,
  out_for_delivery: 9,
  delivered: 100,
  ndr: 20,
  rto_initiated: 30,
  rto_in_transit: 31,
  rto_delivered: 101,
  cancelled: 100,
  return_in_transit: 40,
  returned: 101,
  error: 1,
  unknown: 0
};

const terminalStatuses = new Set<ShipmentStatus>(['delivered', 'rto_delivered', 'cancelled', 'returned']);

export const canApplyShipmentStatus = (current: ShipmentStatus, next: ShipmentStatus): boolean => {
  if (current === next || next === 'unknown') return false;
  if (terminalStatuses.has(current)) return false;
  if (next === 'ndr' || next.startsWith('rto_') || next.startsWith('return')) return true;
  return statusRank[next] >= statusRank[current];
};

export const isTerminalShipmentStatus = (status: ShipmentStatus): boolean => terminalStatuses.has(status);
