// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isCustomerVisibleProduct } from '@/lib/customer-state';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';

export interface LogisticsQuoteOption {
  code: 'standard' | 'express';
  label: string;
  shippingCharge: number;
  providerCost: number;
  codCharge: number;
  courierId: number;
  courierName: string;
  shippingMode: 'surface' | 'air' | 'unknown';
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  codAvailable: boolean;
}

export interface LogisticsQuote {
  quoteId: string;
  deliveryPostcode: string;
  paymentMode: 'prepaid' | 'cod';
  options: LogisticsQuoteOption[];
  expiresAt: string;
  package: { measurementConfirmed: boolean; warnings: string[] };
}

export interface ShipmentTracking {
  orderId: string;
  orderNumber?: string;
  fulfillmentStatus: string;
  shipments: Array<{
    id: string;
    type: 'forward' | 'return' | 'exchange_replacement';
    status: string;
    courierName?: string;
    awb?: string;
    estimatedDelivery?: string;
    scans: Array<{ status: string; rawStatus: string; message: string; location?: string; timestamp: string }>;
  }>;
}

export const useLogisticsQuote = (deliveryPostcode: string, paymentMode: 'prepaid' | 'cod') => useQuery({
  queryKey: ['logistics-quote', deliveryPostcode, paymentMode],
  enabled: /^[1-9]\d{5}$/.test(deliveryPostcode),
  retry: false,
  staleTime: 10 * 60_000,
  queryFn: async (): Promise<LogisticsQuote> => {
    const items = useCartStore.getState().items.filter((item) => isCustomerVisibleProduct(item.product));
    if (items.length === 0) throw new Error('Add an item before checking delivery');
    await api.put('/cart/sync', { items: items.map((item) => ({ product: item.product.id, variant: item.variantId, quantity: item.quantity })) });
    const response = await api.post<ApiEnvelope<LogisticsQuote>>('/logistics/quotes', { deliveryPostcode, paymentMode });
    return response.data.data;
  }
});

export const useOrderTracking = (orderId: string | undefined) => useQuery({
  queryKey: ['order-tracking', orderId],
  enabled: Boolean(orderId),
  refetchInterval: 60_000,
  queryFn: async (): Promise<ShipmentTracking> => {
    const response = await api.get<ApiEnvelope<ShipmentTracking>>(`/orders/${orderId}/tracking`);
    return response.data.data;
  }
});
