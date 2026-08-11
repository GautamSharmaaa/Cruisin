// Governed by .rules v1.0
import crypto from 'node:crypto';
import type {
  AssignCourierInput,
  AssignCourierResult,
  CancelShipmentInput,
  CancelShipmentResult,
  CreateLogisticsOrderInput,
  CreateLogisticsOrderResult,
  CreateReturnInput,
  CreateReturnResult,
  CourierRate,
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
import { LogisticsProviderError } from '../../types/logistics.types.js';
import type { LogisticsProvider } from './logistics-provider.js';

export const mockLogisticsFixtures = {
  prepaidAndCodPincode: '560001',
  prepaidOnlyPincode: '110001',
  nonServiceablePincode: '999999',
  timeoutPincode: '500500',
  rateLimitedPincode: '429429',
  outagePincode: '503503'
} as const;

const idFrom = (value: string): string => Number.parseInt(crypto.createHash('sha256').update(value).digest('hex').slice(0, 10), 16).toString();

const courierOptions = (cod: boolean): CourierRate[] => [
  { courierId: 10, courierName: 'Mock Surface', shippingMode: 'surface', freightCharge: 92, codCharge: cod ? 38 : 0, totalCharge: cod ? 130 : 92, estimatedDeliveryDays: 5, codAvailable: true, serviceable: true, rating: 4.3 },
  { courierId: 235, courierName: 'Mock Express', shippingMode: 'air', freightCharge: 148, codCharge: cod ? 42 : 0, totalCharge: cod ? 190 : 148, estimatedDeliveryDays: 2, codAvailable: true, serviceable: true, rating: 4.6 }
];

const fixtureFailure = async (postcode: string): Promise<void> => {
  if (postcode === mockLogisticsFixtures.timeoutPincode) throw new LogisticsProviderError('timeout', 'Mock logistics timeout', true, 504);
  if (postcode === mockLogisticsFixtures.rateLimitedPincode) throw new LogisticsProviderError('rate_limited', 'Mock logistics rate limit', true, 503);
  if (postcode === mockLogisticsFixtures.outagePincode) throw new LogisticsProviderError('temporary_provider', 'Mock logistics outage', true, 503);
};

const documentResult = (kind: string, id: string): DocumentResult => ({
  url: `mock://logistics/${kind}/${encodeURIComponent(id)}.pdf`,
  generatedAt: new Date().toISOString()
});

export class MockLogisticsProvider implements LogisticsProvider {
  private readonly sourceOrders = new Map<string, CreateLogisticsOrderResult>();
  private readonly transientOrderAttempts = new Map<string, number>();
  private readonly awbs = new Map<string, AssignCourierResult>();
  private readonly cancelled = new Set<string>();

  public async authenticate(): Promise<void> {
    return undefined;
  }

  public async validatePickupLocation(_pickupLocation: string, _pickupPostcode: string): Promise<void> {
    return undefined;
  }

  public async checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityResult> {
    await fixtureFailure(input.deliveryPostcode);
    if (input.deliveryPostcode === mockLogisticsFixtures.nonServiceablePincode) {
      return { serviceable: false, codAvailable: false, couriers: [], reason: 'Delivery is unavailable for this pincode' };
    }
    const codAvailable = input.deliveryPostcode !== mockLogisticsFixtures.prepaidOnlyPincode;
    const couriers = courierOptions(input.paymentMode === 'cod').filter((courier) => input.paymentMode !== 'cod' || codAvailable);
    return { serviceable: couriers.length > 0, codAvailable, couriers, reason: couriers.length > 0 ? undefined : 'Cash on delivery is unavailable for this pincode' };
  }

  public async getRates(input: ShippingRateInput): Promise<ShippingRateResult> {
    const result = await this.checkServiceability(input);
    return { serviceable: result.serviceable, couriers: result.couriers };
  }

  public async createOrder(input: CreateLogisticsOrderInput): Promise<CreateLogisticsOrderResult> {
    if (input.sourceOrderId.includes('TEMPORARY-OUTAGE')) throw new LogisticsProviderError('temporary_provider', 'Mock provider outage', true, 503);
    if (input.sourceOrderId.includes('OUTAGE-ONCE')) {
      const attempts = this.transientOrderAttempts.get(input.sourceOrderId) ?? 0;
      this.transientOrderAttempts.set(input.sourceOrderId, attempts + 1);
      if (attempts === 0) throw new LogisticsProviderError('temporary_provider', 'Mock provider recovered after one outage', true, 503);
    }
    if (input.sourceOrderId.includes('MALFORMED')) throw new LogisticsProviderError('permanent_provider', 'Mock malformed provider response', false);
    const existing = this.sourceOrders.get(input.sourceOrderId);
    if (existing) throw new LogisticsProviderError('duplicate', 'Mock duplicate logistics order', false, 409);
    const suffix = idFrom(input.sourceOrderId);
    const result = { providerOrderId: `MO-${suffix}`, providerShipmentId: `MS-${suffix}`, status: 'NEW' };
    this.sourceOrders.set(input.sourceOrderId, result);
    return result;
  }

  public async assignCourier(input: AssignCourierInput): Promise<AssignCourierResult> {
    const existing = this.awbs.get(input.providerShipmentId);
    if (existing) return existing;
    const courier = courierOptions(false).find((option) => option.courierId === input.courierId) ?? courierOptions(false)[0];
    const result = { awb: `MOCKAWB${idFrom(input.providerShipmentId).slice(0, 10)}`, courierId: courier.courierId, courierName: courier.courierName, status: 'AWB Assigned' };
    this.awbs.set(input.providerShipmentId, result);
    return result;
  }

  public async schedulePickup(input: SchedulePickupInput): Promise<SchedulePickupResult> {
    if (input.providerShipmentId.includes('REJECT')) throw new LogisticsProviderError('permanent_provider', 'Mock pickup rejection', false, 409);
    return { pickupScheduled: true, pickupDate: new Date(Date.now() + 86_400_000).toISOString(), status: 'Pickup Scheduled' };
  }

  public async generateLabel(input: DocumentInput): Promise<DocumentResult> {
    return documentResult('label', input.providerShipmentId ?? 'unknown');
  }

  public async generateInvoice(input: DocumentInput): Promise<DocumentResult> {
    return documentResult('invoice', input.providerOrderId ?? 'unknown');
  }

  public async generateManifest(input: DocumentInput): Promise<DocumentResult> {
    return documentResult('manifest', input.providerShipmentId ?? 'unknown');
  }

  public async trackShipment(input: TrackingInput): Promise<TrackingResult> {
    const awb = input.awb ?? `MOCKAWB${idFrom(input.providerShipmentId ?? input.providerOrderId ?? 'unknown').slice(0, 10)}`;
    if (this.cancelled.has(awb)) return { awb, courierName: 'Mock Surface', status: 'cancelled', rawStatus: 'Cancelled', scans: [] };
    const scenario = awb.toUpperCase();
    const rawStatus = scenario.includes('RTODELIVERED') ? 'RTO Delivered'
      : scenario.includes('RTO') ? 'RTO In Transit'
        : scenario.includes('NDR') || scenario.includes('FAILED') ? 'NDR'
          : scenario.includes('DELIVERED') ? 'Delivered'
            : 'In Transit';
    const status = scenario.includes('RTODELIVERED') ? 'rto_delivered'
      : scenario.includes('RTO') ? 'rto_in_transit'
        : scenario.includes('NDR') || scenario.includes('FAILED') ? 'ndr'
          : scenario.includes('DELIVERED') ? 'delivered'
            : 'in_transit';
    const now = new Date();
    return {
      awb,
      courierName: 'Mock Surface',
      status,
      rawStatus,
      estimatedDelivery: new Date(now.getTime() + 3 * 86_400_000).toISOString(),
      scans: [
        { status: 'picked_up', rawStatus: 'Picked Up', message: 'Shipment picked up', location: 'Bengaluru', timestamp: new Date(now.getTime() - 48 * 3_600_000).toISOString() },
        { status, rawStatus, message: rawStatus === 'NDR' ? 'Customer unavailable; reattempt available' : rawStatus, location: 'Destination hub', timestamp: now.toISOString() }
      ]
    };
  }

  public async reconcileShipment(input: ReconcileShipmentInput): Promise<ReconcileShipmentResult> {
    const tracked = await this.trackShipment(input);
    return {
      ...tracked,
      providerOrderId: input.providerOrderId,
      providerShipmentId: input.providerShipmentId,
      courierId: 10,
      pickupStatus: 'Pickup Scheduled',
      pickupDate: new Date().toISOString()
    };
  }

  public async cancelShipment(input: CancelShipmentInput): Promise<CancelShipmentResult> {
    if (input.awb.includes('DELIVERED')) throw new LogisticsProviderError('permanent_provider', 'Delivered shipments cannot be cancelled', false, 409);
    this.cancelled.add(input.awb);
    return { cancelled: true, status: 'Cancelled' };
  }

  public async createReturn(input: CreateReturnInput): Promise<CreateReturnResult> {
    const result = await this.createOrder({ ...input, sourceOrderId: `RETURN-${input.sourceOrderId}` });
    return { ...result, awb: `MOCKRETURN${idFrom(result.providerShipmentId).slice(0, 8)}` };
  }
}
