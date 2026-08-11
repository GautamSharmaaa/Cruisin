// Governed by .rules v1.0

export const shipmentTypes = ['forward', 'return', 'exchange_replacement'] as const;
export type ShipmentType = (typeof shipmentTypes)[number];

export const shipmentStatuses = [
  'draft',
  'pending_provider',
  'provider_order_created',
  'awb_assigned',
  'pickup_scheduled',
  'out_for_pickup',
  'picked_up',
  'shipped',
  'in_transit',
  'reached_destination_hub',
  'out_for_delivery',
  'delivered',
  'delivery_exception',
  'ndr',
  'rto_initiated',
  'rto_in_transit',
  'rto_delivered',
  'cancelled',
  'lost',
  'damaged',
  'return_in_transit',
  'returned',
  'error',
  'unknown'
] as const;
export type ShipmentStatus = (typeof shipmentStatuses)[number];

export interface PackageDimensions {
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export interface PackageMeasurement extends PackageDimensions {
  productWeightKg: number;
  packagingWeightKg: number;
  deadWeightKg: number;
  chargedWeightKg?: number;
  packagePreset?: string;
  measurementConfirmed: boolean;
  warnings: string[];
}

export interface ServiceabilityInput extends PackageDimensions {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  paymentMode: 'prepaid' | 'cod';
  declaredValue: number;
  isReturn?: boolean;
}

export interface CourierRate {
  courierId: number;
  courierName: string;
  shippingMode: 'surface' | 'air' | 'unknown';
  freightCharge: number;
  codCharge: number;
  totalCharge: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  codAvailable: boolean;
  serviceable: boolean;
  rating?: number;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  codAvailable: boolean;
  couriers: CourierRate[];
  reason?: string;
}

export type ShippingRateInput = ServiceabilityInput;

export interface ShippingRateResult {
  serviceable: boolean;
  couriers: CourierRate[];
}

export interface LogisticsOrderItem {
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
  discount: number;
  tax: number;
  hsn?: string;
}

export interface LogisticsAddress {
  name: string;
  phone: string;
  email?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

export interface CreateLogisticsOrderInput {
  localOrderId: string;
  sourceOrderId: string;
  orderDate: Date;
  pickupLocation: string;
  address: LogisticsAddress;
  items: LogisticsOrderItem[];
  paymentMode: 'prepaid' | 'cod';
  subtotal: number;
  shippingCharge: number;
  totalDiscount: number;
  total: number;
  package: PackageMeasurement;
}

export interface CreateLogisticsOrderResult {
  providerOrderId: string;
  providerShipmentId: string;
  status: string;
}

export interface AssignCourierInput {
  providerShipmentId: string;
  courierId?: number;
  isReturn?: boolean;
}

export interface AssignCourierResult {
  awb: string;
  courierId?: number;
  courierName?: string;
  status: string;
}

export interface SchedulePickupInput {
  providerShipmentId: string;
}

export interface SchedulePickupResult {
  pickupScheduled: boolean;
  pickupDate?: string;
  status: string;
}

export interface DocumentInput {
  providerOrderId?: string;
  providerShipmentId?: string;
}

export interface DocumentResult {
  url: string;
  generatedAt: string;
}

export interface TrackingInput {
  awb?: string;
  providerShipmentId?: string;
  providerOrderId?: string;
}

export interface TrackingScan {
  status: ShipmentStatus;
  rawStatus: string;
  providerStatusId?: number;
  message: string;
  location?: string;
  timestamp: string;
}

export interface TrackingResult {
  awb?: string;
  courierName?: string;
  status: ShipmentStatus;
  rawStatus: string;
  estimatedDelivery?: string;
  scans: TrackingScan[];
}

export interface ReconcileShipmentInput {
  providerOrderId?: string;
  providerShipmentId?: string;
  awb?: string;
}

export interface ReconcileShipmentResult extends TrackingResult {
  providerOrderId?: string;
  providerShipmentId?: string;
  courierId?: number;
  pickupStatus?: string;
  pickupDate?: string;
  providerStatusId?: number;
  shippingMode?: 'surface' | 'air' | 'unknown';
  providerShippingCost?: number;
  codCharge?: number;
  chargedWeightKg?: number;
  otherProviderCharges?: number;
  rtoCost?: number;
}

export interface CancelShipmentInput {
  awb: string;
}

export interface CancelShipmentResult {
  cancelled: boolean;
  status: string;
}

export interface CreateReturnInput extends CreateLogisticsOrderInput {
  originalAwb?: string;
  returnReason: string;
}

export interface CreateReturnResult extends CreateLogisticsOrderResult {
  awb?: string;
}

export type LogisticsErrorCode =
  | 'authentication'
  | 'configuration'
  | 'duplicate'
  | 'invalid_payload'
  | 'not_serviceable'
  | 'permanent_provider'
  | 'rate_limited'
  | 'timeout'
  | 'temporary_provider'
  | 'unknown';

export class LogisticsProviderError extends Error {
  public constructor(
    public readonly code: LogisticsErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly statusCode = 502,
    public readonly providerReference?: string
  ) {
    super(message);
    this.name = 'LogisticsProviderError';
  }
}
