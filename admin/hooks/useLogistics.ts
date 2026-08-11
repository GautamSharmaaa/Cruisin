// Governed by .rules v1.0
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ApiEnvelope<TData> {
  data: TData;
  message: string;
}
export interface Shipment {
  _id: string;
  sourceOrderId: string;
  order?:
    | string
    | {
        _id?: string;
        orderNumber?: string;
        shippingAddress?: { fullName?: string; postalCode?: string };
        total?: number;
      };
  shipmentType: "forward" | "return" | "exchange_replacement";
  shipmentStatus: string;
  courierName?: string;
  awb?: string;
  providerOrderId?: string;
  providerShipmentId?: string;
  pickupStatus?: string;
  estimatedDelivery?: string;
  lastTrackingUpdate?: string;
  lastWebhookAt?: string;
  lastSuccessfulSyncAt?: string;
  lastSyncAttemptAt?: string;
  lastSyncSource?: "webhook" | "manual_sync" | "scheduled_reconciliation";
  syncErrorCode?: string;
  trackingScans: Array<{
    fingerprint: string;
    status: string;
    rawStatus: string;
    providerStatusId?: number;
    message: string;
    location?: string;
    timestamp: string;
  }>;
  shippingChargeCollected?: number;
  providerShippingCost?: number;
  codCharge?: number;
  package?: {
    deadWeightKg: number;
    lengthCm: number;
    breadthCm: number;
    heightCm: number;
    measurementConfirmed: boolean;
    warnings: string[];
  };
  lastProviderError?: { code?: string; message?: string; retryable?: boolean };
  label?: {
    status?: "pending" | "ready" | "failed";
    url?: string;
    generatedAt?: string;
    expiresAt?: string;
    lastError?: string;
  };
  invoice?: {
    status?: "pending" | "ready" | "failed";
    url?: string;
    generatedAt?: string;
    expiresAt?: string;
    lastError?: string;
  };
  manifest?: {
    status?: "pending" | "ready" | "failed";
    url?: string;
    generatedAt?: string;
    expiresAt?: string;
    lastError?: string;
  };
  ndr?: {
    reason?: string;
    occurredAt?: string;
    attemptCount?: number;
    currentAction?: string;
    reattemptStatus?: string;
    lastCustomerContactAt?: string;
    rtoRisk?: string;
    nextActionDeadline?: string;
  };
  rto?: {
    reason?: string;
    initiatedAt?: string;
    currentLocation?: string;
    expectedReturnAt?: string;
    status?: string;
    inventoryRecoveryStatus?: string;
    warehouseReceivedAt?: string;
    inspectedAt?: string;
  };
  updatedAt: string;
}
export interface ShipmentPage {
  items: Shipment[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}
export interface LogisticsKpis {
  total: number;
  ready: number;
  inTransit: number;
  delivered: number;
  ndr: number;
  rto: number;
  errors: number;
  logisticsCost: number;
  deliveryRate: number;
  ndrRate: number;
  rtoRate: number;
}
export interface LogisticsSyncHealth {
  activeShipments: number;
  lastWebhookAt?: string;
  lastReconciliationAt?: string;
  syncFailures: number;
}
export interface CourierRate {
  courierId: number;
  courierName: string;
  shippingMode: "surface" | "air" | "unknown";
  freightCharge: number;
  codCharge: number;
  totalCharge: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  codAvailable: boolean;
  serviceable: boolean;
  rating?: number;
}
export interface CourierComparison {
  serviceable: boolean;
  couriers: CourierRate[];
}
export interface LogisticsAnalytics {
  days: number;
  daily: Array<{ _id: string; shipments: number; cost: number }>;
  couriers: Array<{
    _id: string;
    shipments: number;
    delivered: number;
    ndr: number;
    cost: number;
  }>;
  statuses: Array<{ _id: string; count: number }>;
}
export interface WorkflowRequest {
  _id: string;
  requestNumber: string;
  status: string;
  reason?: string;
  requestedSku?: string;
  refundStatus?: string;
  createdAt: string;
  order?: { orderNumber?: string };
}
export interface LogisticsDocumentAccess {
  shipmentId: string;
  kind: "label" | "invoice" | "manifest";
  status: "ready";
  url: string;
  generatedAt: string;
  expiresAt: string;
}
export interface LogisticsNotificationEvent {
  _id: string;
  eventType: string;
  status: string;
  title: string;
  body: string;
  createdAt: string;
  deliveries: Array<{
    channel: string;
    template: string;
    recipient: string;
    status: string;
    attempts: number;
    lastError?: string;
  }>;
}
export interface LogisticsNotificationPage {
  items: LogisticsNotificationEvent[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export const useShipments = (
  filters: {
    page?: number;
    limit?: number;
    orderId?: string;
    status?: string;
    type?: string;
    search?: string;
  } = {},
) =>
  useQuery({
    queryKey: ["admin", "logistics", filters],
    queryFn: async (): Promise<ShipmentPage> =>
      (
        await api.get<ApiEnvelope<ShipmentPage>>("/admin/logistics", {
          params: filters,
        })
      ).data.data,
  });
export const useLogisticsKpis = () =>
  useQuery({
    queryKey: ["admin", "logistics", "kpis"],
    queryFn: async (): Promise<LogisticsKpis> =>
      (await api.get<ApiEnvelope<LogisticsKpis>>("/admin/logistics/kpis")).data
        .data,
  });
export const useLogisticsSyncHealth = () =>
  useQuery({
    queryKey: ["admin", "logistics", "sync-health"],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<LogisticsSyncHealth> =>
      (await api.get<ApiEnvelope<LogisticsSyncHealth>>("/admin/logistics/sync-health")).data.data,
  });
export const useLogisticsAnalytics = (days: number) =>
  useQuery({
    queryKey: ["admin", "logistics", "analytics", days],
    queryFn: async (): Promise<LogisticsAnalytics> =>
      (
        await api.get<ApiEnvelope<LogisticsAnalytics>>(
          "/admin/logistics/analytics",
          { params: { days } },
        )
      ).data.data,
  });
export const useAdminReturns = () =>
  useQuery({
    queryKey: ["admin", "returns"],
    queryFn: async (): Promise<WorkflowRequest[]> =>
      (await api.get<ApiEnvelope<WorkflowRequest[]>>("/admin/returns")).data
        .data,
  });
export const useAdminExchanges = () =>
  useQuery({
    queryKey: ["admin", "exchanges"],
    queryFn: async (): Promise<WorkflowRequest[]> =>
      (await api.get<ApiEnvelope<WorkflowRequest[]>>("/admin/exchanges")).data
        .data,
  });
export const useFailedLogisticsNotifications = () =>
  useQuery({
    queryKey: ["admin", "logistics", "notifications", "failed"],
    queryFn: async (): Promise<LogisticsNotificationPage> =>
      (
        await api.get<ApiEnvelope<LogisticsNotificationPage>>(
          "/admin/logistics/notifications",
          { params: { status: "failed", page: 1, limit: 10 } },
        )
      ).data.data,
  });
export const getLogisticsDocumentAccess = async (
  shipmentId: string,
  kind: "label" | "invoice" | "manifest",
): Promise<LogisticsDocumentAccess> => {
  return (
    await api.get<ApiEnvelope<LogisticsDocumentAccess>>(
      `/admin/logistics/${shipmentId}/documents/${kind}`,
    )
  ).data.data;
};

export const compareLogisticsCouriers = async (
  shipmentId: string,
): Promise<CourierComparison> =>
  (
    await api.post<ApiEnvelope<CourierComparison>>(
      `/admin/logistics/${shipmentId}/compare-couriers`,
      {},
    )
  ).data.data;

export const useLogisticsAction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      path: string;
      body?: Record<string, unknown>;
    }): Promise<unknown> =>
      (await api.post<ApiEnvelope<unknown>>(input.path, input.body ?? {})).data
        .data,
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin", "logistics"] }),
        client.invalidateQueries({ queryKey: ["admin", "orders"] }),
        client.invalidateQueries({ queryKey: ["admin", "logistics", "notifications"] }),
        client.invalidateQueries({ queryKey: ["admin", "analytics"] }),
        client.invalidateQueries({ queryKey: ["admin", "overview"] }),
      ]);
    },
  });
};

export const useWorkflowAction = (kind: "returns" | "exchanges") => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: string;
      note?: string;
    }): Promise<unknown> =>
      (
        await api.post<ApiEnvelope<unknown>>(
          `/admin/${kind}/${input.id}/action`,
          { action: input.action, note: input.note },
        )
      ).data.data,
    onSuccess: async (): Promise<void> =>
      client.invalidateQueries({ queryKey: ["admin", kind] }),
  });
};
