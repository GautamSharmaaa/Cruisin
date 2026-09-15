import type { ShipmentTracking } from '@/hooks/useLogistics';
import type { Order } from '@/types/order.types';

export type ReturnEligibility = 'eligible' | 'checking' | 'unavailable' | 'before_delivery' | 'cancelled' | 'expired';

export interface ReturnEligibilityInput {
  order: Pick<Order, 'orderStatus' | 'status' | 'cancellation'>;
  returnWindow?: ShipmentTracking['returnWindow'];
  trackingPending?: boolean;
  trackingError?: boolean;
  now?: number;
}

export function returnEligibility({ order, returnWindow, trackingPending, trackingError, now = Date.now() }: ReturnEligibilityInput): ReturnEligibility {
  if (order.cancellation || [order.orderStatus, order.status].includes('cancelled')) return 'cancelled';
  if (trackingPending) return 'checking';
  if (trackingError) return 'unavailable';
  if (!returnWindow) return [order.orderStatus, order.status].includes('delivered') ? 'unavailable' : 'before_delivery';
  const deliveredAt = Date.parse(returnWindow.deliveredAt);
  const endsAt = Date.parse(returnWindow.endsAt);
  if (!Number.isFinite(deliveredAt) || !Number.isFinite(endsAt) || deliveredAt > now || endsAt <= deliveredAt) return 'unavailable';
  if (endsAt <= now) return 'expired';
  return returnWindow.eligible ? 'eligible' : 'unavailable';
}
