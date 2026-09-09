// Governed by .rules v1.0
import type { WorkflowRequest } from '@/hooks/useLogistics';

export interface ExchangeOrderGroup {
  orderId: string;
  orderNumber: string;
  requests: WorkflowRequest[];
}

export const groupExchangeRequestsByOrder = (requests: WorkflowRequest[]): ExchangeOrderGroup[] => {
  return Array.from(requests.reduce((grouped, request) => {
    const orderId = request.order?._id ?? request.order?.orderNumber ?? request._id;
    const current = grouped.get(orderId);
    if (current) current.requests.push(request);
    else grouped.set(orderId, { orderId, orderNumber: request.order?.orderNumber ?? 'Order', requests: [request] });
    return grouped;
  }, new Map<string, ExchangeOrderGroup>()).values());
};

export const exchangeOrderLine = (request: WorkflowRequest) => {
  return request.order?.items?.find((item) => item.variant === request.originalItem?.variant);
};
