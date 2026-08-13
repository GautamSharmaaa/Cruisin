import type { ShipmentStatus, ShipmentType } from '../../types/logistics.types.js';

export interface CustomerTrackingScan {
  status: ShipmentStatus;
  message?: string;
  location?: string;
  timestamp: Date | string;
}

export interface CustomerTrackingMilestone {
  key: string;
  label: string;
  message: string;
  reachedAt?: Date | string;
  current: boolean;
  completed: boolean;
  exception: boolean;
  scans: Array<{ message: string; location?: string; timestamp: Date | string }>;
}

const normalSteps = [
  { key: 'confirmed', label: 'Order confirmed', message: 'Your order has been confirmed.' },
  { key: 'preparing', label: 'Preparing', message: 'Your order is being prepared for shipment.' },
  { key: 'shipped', label: 'Shipped', message: 'Your parcel has been handed to the courier.' },
  { key: 'in_transit', label: 'In transit', message: 'Your package is moving through the courier network.' },
  { key: 'out_for_delivery', label: 'Out for delivery', message: 'Your order is out for delivery today.' },
  { key: 'delivered', label: 'Delivered', message: 'Your order has been delivered.' }
] as const;
const returnSteps = [
  { key: 'return_requested', label: 'Return requested', message: 'Your return request is in the reverse-logistics workflow.' },
  { key: 'pickup_scheduled', label: 'Pickup scheduled', message: 'Courier pickup is being arranged for your return.' },
  { key: 'picked_up', label: 'Picked up', message: 'The courier has collected your return.' },
  { key: 'return_in_transit', label: 'Return in transit', message: 'Your return is moving back to Cruisin.' },
  { key: 'received', label: 'Received', message: 'Cruisin has received your returned parcel.' }
] as const;

const milestoneKey = (status: ShipmentStatus, type: ShipmentType = 'forward'): string => {
  if (type === 'return') {
    if (['draft', 'pending_provider', 'provider_order_created'].includes(status)) return 'return_requested';
    if (['awb_assigned', 'pickup_scheduled', 'out_for_pickup'].includes(status)) return 'pickup_scheduled';
    if (['picked_up', 'shipped'].includes(status)) return 'picked_up';
    if (['in_transit', 'reached_destination_hub', 'return_in_transit'].includes(status)) return 'return_in_transit';
    if (['delivered', 'returned'].includes(status)) return 'received';
  }
  if (['draft', 'pending_provider', 'provider_order_created', 'awb_assigned', 'pickup_scheduled', 'out_for_pickup'].includes(status)) return 'preparing';
  if (['picked_up', 'shipped'].includes(status)) return 'shipped';
  if (['in_transit', 'reached_destination_hub'].includes(status)) return 'in_transit';
  return status;
};

const exceptionCopy: Partial<Record<ShipmentStatus, { label: string; message: string }>> = {
  delivery_exception: { label: 'Delivery attempt failed', message: 'The courier could not complete delivery. Action may be required.' },
  ndr: { label: 'Delivery action required', message: 'The courier could not complete delivery. Action may be required.' },
  rto_initiated: { label: 'Return to sender initiated', message: 'The parcel is being returned to the sender.' },
  rto_in_transit: { label: 'Returning to sender', message: 'The parcel is moving back through the courier network.' },
  rto_delivered: { label: 'Returned to sender', message: 'The parcel has been returned to the sender.' },
  cancelled: { label: 'Shipment cancelled', message: 'This shipment was cancelled.' },
  lost: { label: 'Shipment issue', message: 'The courier has reported the parcel as lost.' },
  damaged: { label: 'Shipment damaged', message: 'The courier has reported damage to the parcel.' },
  error: { label: 'Shipping update unavailable', message: 'Shipping information needs attention.' },
  unknown: { label: 'Shipping update pending', message: 'The latest courier update is being reviewed.' }
};

const scanMessage = (status: ShipmentStatus, type: ShipmentType): string => {
  const key = milestoneKey(status, type);
  if (type === 'return') return returnSteps.find((step) => step.key === key)?.message ?? exceptionCopy[status]?.message ?? 'Courier update received.';
  if (key === 'in_transit') return status === 'reached_destination_hub' ? 'Your package has reached the destination area.' : 'Your package is moving through the courier network.';
  return normalSteps.find((step) => step.key === key)?.message ?? exceptionCopy[status]?.message ?? 'Courier update received.';
};

export const buildCustomerTrackingMilestones = (input: {
  status: ShipmentStatus;
  type?: ShipmentType;
  createdAt?: Date | string;
  scans: CustomerTrackingScan[];
}): { milestones: CustomerTrackingMilestone[]; currentMilestone: string; latestMessage: string } => {
  const type = input.type ?? 'forward';
  const steps = type === 'return' ? returnSteps : normalSteps;
  const currentKey = milestoneKey(input.status, type);
  const exception = exceptionCopy[input.status];
  const statusIndex = steps.findIndex((step) => step.key === currentKey);
  const latestNormalScanIndex = input.scans.reduce((highest, scan) => Math.max(highest, steps.findIndex((step) => step.key === milestoneKey(scan.status, type))), -1);
  const currentIndex = exception ? Math.max(0, latestNormalScanIndex) : statusIndex;
  const grouped = new Map<string, CustomerTrackingMilestone['scans']>();
  const scansInTimeOrder = [...input.scans].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  for (const scan of scansInTimeOrder) {
    const key = milestoneKey(scan.status, type);
    const values = grouped.get(key) ?? [];
    values.push({ message: scanMessage(scan.status, type), location: scan.location, timestamp: scan.timestamp });
    grouped.set(key, values);
  }
  const milestones = steps.map((step, index): CustomerTrackingMilestone => {
    const scans = grouped.get(step.key) ?? [];
    return {
      ...step,
      reachedAt: scans.at(-1)?.timestamp ?? (['confirmed', 'return_requested'].includes(step.key) ? input.createdAt : undefined),
      current: !exception && index === currentIndex,
      completed: currentIndex >= index,
      exception: false,
      scans
    };
  });
  if (exception) milestones.push({ key: input.status, ...exception, reachedAt: scansInTimeOrder.at(-1)?.timestamp, current: true, completed: true, exception: true, scans: grouped.get(input.status) ?? [] });
  const latest = [...milestones].reverse().find((milestone) => milestone.current || milestone.completed);
  return { milestones, currentMilestone: exception ? input.status : currentKey, latestMessage: latest?.message ?? 'Your order is being prepared for shipment.' };
};
