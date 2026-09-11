// Governed by .rules v1.0
import type {
  AssignCourierInput,
  AssignCourierResult,
  CancelShipmentInput,
  CancelShipmentResult,
  CreateLogisticsOrderInput,
  CreateLogisticsOrderResult,
  CreateReturnInput,
  CreateReturnResult,
  DocumentInput,
  DocumentResult,
  ReconcileShipmentInput,
  ReconcileShipmentResult,
  SchedulePickupInput,
  SchedulePickupResult,
  ServiceabilityInput,
  ServiceabilityResult,
  ShippingRateInput,
  ShippingRateResult,
  TrackingInput,
  TrackingResult
} from '../../types/logistics.types.js';

export interface LogisticsProvider {
  authenticate(): Promise<void>;
  validatePickupLocation(pickupLocation: string, pickupPostcode: string): Promise<void>;
  checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityResult>;
  getRates(input: ShippingRateInput): Promise<ShippingRateResult>;
  createOrder(input: CreateLogisticsOrderInput): Promise<CreateLogisticsOrderResult>;
  assignCourier(input: AssignCourierInput): Promise<AssignCourierResult>;
  schedulePickup(input: SchedulePickupInput): Promise<SchedulePickupResult>;
  generateLabel(input: DocumentInput): Promise<DocumentResult>;
  generateInvoice(input: DocumentInput): Promise<DocumentResult>;
  generateManifest(input: DocumentInput): Promise<DocumentResult>;
  trackShipment(input: TrackingInput): Promise<TrackingResult>;
  reconcileShipment(input: ReconcileShipmentInput): Promise<ReconcileShipmentResult>;
  cancelShipment(input: CancelShipmentInput): Promise<CancelShipmentResult>;
  createReturn(input: CreateReturnInput): Promise<CreateReturnResult>;
}
