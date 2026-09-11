type ReverseShipmentState = { shipmentStatus: string; providerShipmentId?: string | null } | null;

export const reverseShipmentRetryDecision = (shipment: ReverseShipmentState): 'create' | 'retry_existing' | 'use_existing' => {
  if (!shipment) return 'create';
  if (shipment.providerShipmentId) return 'use_existing';
  return 'retry_existing';
};
