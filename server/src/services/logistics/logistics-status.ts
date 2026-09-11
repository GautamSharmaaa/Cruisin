// Governed by .rules v1.0
import type { ShipmentStatus } from '../../types/logistics.types.js';

const exactStatusMap: Record<string, ShipmentStatus> = {
  new: 'provider_order_created',
  'awb assigned': 'awb_assigned',
  'pickup scheduled': 'pickup_scheduled',
  'pickup queued': 'pickup_scheduled',
  'out for pickup': 'out_for_pickup',
  'pickup rescheduled': 'pickup_scheduled',
  'pickup booked': 'pickup_scheduled',
  'picked up': 'picked_up',
  shipped: 'shipped',
  'in transit': 'in_transit',
  'reached at destination': 'reached_destination_hub',
  'reached destination hub': 'reached_destination_hub',
  'out for delivery': 'out_for_delivery',
  delivered: 'delivered',
  ndr: 'ndr',
  'undelivered': 'ndr',
  delayed: 'delivery_exception',
  'pickup exception': 'delivery_exception',
  'pickup error': 'delivery_exception',
  misrouted: 'delivery_exception',
  'rto initiated': 'rto_initiated',
  'rto in transit': 'rto_in_transit',
  'rto delivered': 'rto_delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  lost: 'lost',
  untraceable: 'lost',
  damaged: 'damaged',
  destroyed: 'damaged',
  'return in transit': 'return_in_transit',
  returned: 'returned'
};

const providerStatusIdMap: Partial<Record<number, ShipmentStatus>> = {
  1: 'awb_assigned',
  3: 'pickup_scheduled',
  4: 'pickup_scheduled',
  6: 'shipped',
  7: 'delivered',
  8: 'cancelled',
  9: 'rto_initiated',
  10: 'rto_delivered',
  12: 'lost',
  13: 'delivery_exception',
  15: 'pickup_scheduled',
  17: 'out_for_delivery',
  18: 'in_transit',
  19: 'out_for_pickup',
  20: 'delivery_exception',
  21: 'ndr',
  22: 'delivery_exception',
  24: 'damaged',
  25: 'damaged',
  38: 'reached_destination_hub',
  39: 'delivery_exception',
  40: 'rto_initiated',
  41: 'rto_initiated',
  42: 'picked_up',
  45: 'cancelled',
  46: 'rto_in_transit',
  76: 'lost'
};

export const normalizeShipmentStatus = (rawStatus: string, providerStatusId?: number): ShipmentStatus => {
  const normalized = rawStatus.trim().toLowerCase().replace(/\s+/g, ' ');
  if (exactStatusMap[normalized]) return exactStatusMap[normalized];
  if (providerStatusId !== undefined && providerStatusIdMap[providerStatusId]) return providerStatusIdMap[providerStatusId]!;
  if (normalized.includes('out for delivery')) return 'out_for_delivery';
  if (normalized.includes('delivered') && normalized.includes('rto')) return 'rto_delivered';
  if (normalized.includes('rto') && normalized.includes('transit')) return 'rto_in_transit';
  if (normalized.includes('rto')) return 'rto_initiated';
  if (normalized.includes('ndr') || normalized.includes('undelivered')) return 'ndr';
  if (normalized.includes('destination')) return 'reached_destination_hub';
  if (normalized.includes('transit')) return 'in_transit';
  if (normalized.includes('out for pickup')) return 'out_for_pickup';
  if (normalized.includes('pickup')) {
    if (normalized.includes('error') || normalized.includes('exception')) return 'delivery_exception';
    return normalized.includes('scheduled') || normalized.includes('queued') || normalized.includes('booked') ? 'pickup_scheduled' : 'picked_up';
  }
  if (normalized.includes('lost') || normalized.includes('untraceable')) return 'lost';
  if (normalized.includes('damage') || normalized.includes('destroy')) return 'damaged';
  if (normalized.includes('delay') || normalized.includes('misroute') || normalized.includes('exception')) return 'delivery_exception';
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
  out_for_pickup: 5,
  picked_up: 5,
  shipped: 6,
  in_transit: 7,
  reached_destination_hub: 8,
  out_for_delivery: 9,
  delivered: 100,
  delivery_exception: 20,
  ndr: 20,
  rto_initiated: 30,
  rto_in_transit: 31,
  rto_delivered: 101,
  cancelled: 100,
  lost: 100,
  damaged: 100,
  return_in_transit: 40,
  returned: 101,
  error: 1,
  unknown: 0
};

const terminalStatuses = new Set<ShipmentStatus>(['delivered', 'rto_delivered', 'cancelled', 'lost', 'damaged', 'returned']);

export const canApplyShipmentStatus = (current: ShipmentStatus, next: ShipmentStatus): boolean => {
  if (current === next || next === 'unknown') return false;
  if (terminalStatuses.has(current)) return false;
  if (next === 'delivery_exception' || next === 'ndr' || next.startsWith('rto_') || next.startsWith('return')) return true;
  return statusRank[next] >= statusRank[current];
};

export const isTerminalShipmentStatus = (status: ShipmentStatus): boolean => terminalStatuses.has(status);
