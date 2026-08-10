// Governed by .rules v1.0
import { z } from 'zod';
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
  SchedulePickupInput,
  SchedulePickupResult,
  ServiceabilityInput,
  ServiceabilityResult,
  ShippingRateInput,
  ShippingRateResult,
  TrackingInput,
  TrackingResult,
  TrackingScan
} from '../../types/logistics.types.js';
import { LogisticsProviderError } from '../../types/logistics.types.js';
import type { LogisticsProvider } from './logistics-provider.js';
import { normalizeShipmentStatus } from './logistics-status.js';
import { ShiprocketClient } from './shiprocket-client.js';

const serviceabilitySchema = z.object({
  data: z.object({
    available_courier_companies: z.array(z.object({
      courier_company_id: z.coerce.number(),
      courier_name: z.string(),
      rate: z.coerce.number().nonnegative(),
      cod_charges: z.coerce.number().nonnegative().default(0),
      etd: z.union([z.string(), z.number()]).optional(),
      estimated_delivery_days: z.union([z.string(), z.number()]).optional(),
      mode: z.union([z.string(), z.number()]).optional(),
      is_surface: z.boolean().optional(),
      cod: z.coerce.number().optional(),
      rating: z.coerce.number().optional()
    }).passthrough()).default([])
  }).passthrough()
}).passthrough();

const pickupLocationsSchema = z.object({
  data: z.object({
    shipping_address: z.array(z.object({
      pickup_location: z.string(),
      pin_code: z.union([z.string(), z.number()])
    }).passthrough())
  }).passthrough()
}).passthrough();

const createOrderSchema = z.object({
  order_id: z.union([z.string(), z.number()]),
  shipment_id: z.union([z.string(), z.number()]),
  status: z.string().optional().default('NEW')
}).passthrough();

const awbSchema = z.object({
  response: z.object({
    data: z.object({
      awb_code: z.union([z.string(), z.number()]),
      courier_company_id: z.coerce.number().optional(),
      courier_name: z.string().optional(),
      assigned_date_time: z.string().optional()
    }).passthrough()
  }).passthrough()
}).passthrough();

const pickupSchema = z.object({
  pickup_status: z.coerce.number().optional(),
  response: z.object({
    pickup_scheduled_date: z.string().optional(),
    pickup_token_number: z.union([z.string(), z.number()]).optional(),
    status: z.union([z.string(), z.number()]).optional()
  }).passthrough().optional()
}).passthrough();

const documentSchema = z.object({
  label_url: z.string().url().optional(),
  invoice_url: z.string().url().optional(),
  manifest_url: z.string().url().optional()
}).passthrough();

const trackingSchema = z.object({
  tracking_data: z.object({
    track_status: z.union([z.string(), z.number()]).optional(),
    shipment_status: z.union([z.string(), z.number()]).optional(),
    shipment_track: z.array(z.object({
      awb_code: z.union([z.string(), z.number()]).optional(),
      courier_name: z.string().optional(),
      current_status: z.string().optional(),
      etd: z.string().optional()
    }).passthrough()).optional(),
    shipment_track_activities: z.array(z.object({
      date: z.string(),
      status: z.string(),
      activity: z.string().optional(),
      location: z.string().optional(),
      'sr-status': z.coerce.number().optional()
    }).passthrough()).optional()
  }).passthrough()
}).passthrough();

const genericStatusSchema = z.record(z.unknown());

const numberValue = (value: string | number | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const courierRate = (courier: z.infer<typeof serviceabilitySchema>['data']['available_courier_companies'][number]): CourierRate => {
  const codCharge = courier.cod_charges;
  const estimatedDeliveryDays = numberValue(courier.estimated_delivery_days);
  const mode = typeof courier.mode === 'string' ? courier.mode.toLowerCase() : undefined;
  const shippingMode = mode?.includes('air')
    ? 'air'
    : mode?.includes('surface') || courier.is_surface === true
      ? 'surface'
      : courier.is_surface === false
        ? 'air'
        : 'unknown';
  return {
    courierId: courier.courier_company_id,
    courierName: courier.courier_name,
    shippingMode,
    freightCharge: courier.rate,
    codCharge,
    totalCharge: courier.rate + codCharge,
    estimatedDeliveryDays,
    estimatedDeliveryDate: typeof courier.etd === 'string' ? courier.etd : undefined,
    codAvailable: courier.cod === 1,
    serviceable: true,
    rating: courier.rating
  };
};

const orderBody = (input: CreateLogisticsOrderInput): Record<string, unknown> => ({
  order_id: input.sourceOrderId.slice(0, 50),
  order_date: input.orderDate.toISOString().replace('T', ' ').slice(0, 16),
  pickup_location: input.pickupLocation,
  billing_customer_name: input.address.name,
  billing_last_name: '',
  billing_address: input.address.address,
  billing_address_2: input.address.address2 ?? '',
  billing_city: input.address.city,
  billing_pincode: Number(input.address.postcode),
  billing_state: input.address.state,
  billing_country: input.address.country,
  billing_email: input.address.email ?? '',
  billing_phone: input.address.phone,
  shipping_is_billing: true,
  order_items: input.items.map((item) => ({
    name: item.name,
    sku: item.sku,
    units: item.units,
    selling_price: item.sellingPrice,
    discount: item.discount,
    tax: item.tax,
    hsn: item.hsn ?? ''
  })),
  payment_method: input.paymentMode === 'cod' ? 'COD' : 'Prepaid',
  shipping_charges: input.shippingCharge,
  giftwrap_charges: 0,
  transaction_charges: 0,
  total_discount: input.totalDiscount,
  sub_total: input.subtotal,
  length: input.package.lengthCm,
  breadth: input.package.breadthCm,
  height: input.package.heightCm,
  weight: input.package.deadWeightKg
});

export class ShiprocketProvider implements LogisticsProvider {
  public constructor(private readonly client = new ShiprocketClient()) {}

  public authenticate(): Promise<void> {
    return this.client.authenticate();
  }

  public async validatePickupLocation(pickupLocation: string, pickupPostcode: string): Promise<void> {
    const response = await this.client.get('/settings/company/pickup', pickupLocationsSchema);
    const normalizedName = pickupLocation.trim().toLowerCase();
    const matching = response.data.shipping_address.find((candidate) => candidate.pickup_location.trim().toLowerCase() === normalizedName);
    if (!matching) throw new LogisticsProviderError('configuration', 'Configured Shiprocket pickup location was not found', false, 409);
    if (String(matching.pin_code) !== pickupPostcode) {
      throw new LogisticsProviderError('configuration', 'Configured Shiprocket pickup postcode does not match the pickup location', false, 409);
    }
  }

  public async checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityResult> {
    const rates = await this.getRates(input);
    return {
      serviceable: rates.serviceable,
      codAvailable: rates.couriers.some((courier) => courier.codAvailable),
      couriers: rates.couriers,
      reason: rates.serviceable ? undefined : 'No courier service is available for this route'
    };
  }

  public async getRates(input: ShippingRateInput): Promise<ShippingRateResult> {
    const response: z.output<typeof serviceabilitySchema> = await this.client.get('/courier/serviceability/', serviceabilitySchema, {
      pickup_postcode: input.pickupPostcode,
      delivery_postcode: input.deliveryPostcode,
      cod: input.paymentMode === 'cod' ? 1 : 0,
      weight: input.weightKg,
      length: input.lengthCm,
      breadth: input.breadthCm,
      height: input.heightCm,
      declared_value: input.declaredValue,
      is_return: input.isReturn ? 1 : 0
    });
    const couriers = response.data.available_courier_companies.map(courierRate);
    return { serviceable: couriers.length > 0, couriers };
  }

  public async createOrder(input: CreateLogisticsOrderInput): Promise<CreateLogisticsOrderResult> {
    const response = await this.client.post('/orders/create/adhoc', orderBody(input), createOrderSchema);
    return { providerOrderId: String(response.order_id), providerShipmentId: String(response.shipment_id), status: response.status ?? 'NEW' };
  }

  public async assignCourier(input: AssignCourierInput): Promise<AssignCourierResult> {
    const response = await this.client.post('/courier/assign/awb', {
      shipment_id: Number(input.providerShipmentId),
      ...(input.courierId ? { courier_id: input.courierId } : {}),
      ...(input.isReturn ? { is_return: 1 } : {})
    }, awbSchema);
    const data = response.response.data;
    return { awb: String(data.awb_code), courierId: data.courier_company_id, courierName: data.courier_name, status: 'AWB Assigned' };
  }

  public async schedulePickup(input: SchedulePickupInput): Promise<SchedulePickupResult> {
    const response = await this.client.post('/courier/generate/pickup', { shipment_id: [Number(input.providerShipmentId)] }, pickupSchema);
    return {
      pickupScheduled: response.pickup_status === 1 || Boolean(response.response?.pickup_scheduled_date),
      pickupDate: response.response?.pickup_scheduled_date,
      status: String(response.response?.status ?? 'Pickup requested')
    };
  }

  public async generateLabel(input: DocumentInput): Promise<DocumentResult> {
    if (!input.providerShipmentId) throw new LogisticsProviderError('invalid_payload', 'Provider shipment ID is required', false, 400);
    const response = await this.client.post('/courier/generate/label', { shipment_id: [Number(input.providerShipmentId)] }, documentSchema);
    if (!response.label_url) throw new LogisticsProviderError('permanent_provider', 'Provider did not return a label', false);
    return { url: response.label_url, generatedAt: new Date().toISOString() };
  }

  public async generateInvoice(input: DocumentInput): Promise<DocumentResult> {
    if (!input.providerOrderId) throw new LogisticsProviderError('invalid_payload', 'Provider order ID is required', false, 400);
    const response = await this.client.post('/orders/print/invoice', { ids: [Number(input.providerOrderId)] }, documentSchema);
    if (!response.invoice_url) throw new LogisticsProviderError('permanent_provider', 'Provider did not return an invoice', false);
    return { url: response.invoice_url, generatedAt: new Date().toISOString() };
  }

  public async generateManifest(input: DocumentInput): Promise<DocumentResult> {
    if (!input.providerShipmentId) throw new LogisticsProviderError('invalid_payload', 'Provider shipment ID is required', false, 400);
    const response = await this.client.post('/manifests/generate', { shipment_id: [Number(input.providerShipmentId)] }, documentSchema);
    if (!response.manifest_url) throw new LogisticsProviderError('permanent_provider', 'Provider did not return a manifest', false);
    return { url: response.manifest_url, generatedAt: new Date().toISOString() };
  }

  public async trackShipment(input: TrackingInput): Promise<TrackingResult> {
    if (!input.awb) throw new LogisticsProviderError('invalid_payload', 'AWB is required for tracking', false, 400);
    const response = await this.client.get(`/courier/track/awb/${encodeURIComponent(input.awb)}`, trackingSchema);
    const summary = response.tracking_data.shipment_track?.[0];
    const rawStatus = summary?.current_status ?? String(response.tracking_data.shipment_status ?? response.tracking_data.track_status ?? 'Unknown');
    const scans: TrackingScan[] = (response.tracking_data.shipment_track_activities ?? []).map((activity) => ({
      status: normalizeShipmentStatus(activity.status),
      rawStatus: activity.status,
      providerStatusId: activity['sr-status'],
      message: activity.activity ?? activity.status,
      location: activity.location,
      timestamp: new Date(activity.date).toISOString()
    }));
    return {
      awb: summary?.awb_code ? String(summary.awb_code) : input.awb,
      courierName: summary?.courier_name,
      status: normalizeShipmentStatus(rawStatus),
      rawStatus,
      estimatedDelivery: summary?.etd,
      scans
    };
  }

  public async cancelShipment(input: CancelShipmentInput): Promise<CancelShipmentResult> {
    const response = await this.client.post('/orders/cancel/shipment/awbs', { awbs: [input.awb] }, genericStatusSchema);
    return { cancelled: true, status: typeof response.message === 'string' ? response.message : 'Cancelled' };
  }

  public async createReturn(input: CreateReturnInput): Promise<CreateReturnResult> {
    const response = await this.client.post('/shipments/create/return-shipment', {
      ...orderBody(input),
      pickup_customer_name: input.address.name,
      pickup_address: input.address.address,
      pickup_address_2: input.address.address2 ?? '',
      pickup_city: input.address.city,
      pickup_state: input.address.state,
      pickup_country: input.address.country,
      pickup_pincode: Number(input.address.postcode),
      pickup_phone: input.address.phone,
      return_reason: input.returnReason
    }, createOrderSchema);
    return { providerOrderId: String(response.order_id), providerShipmentId: String(response.shipment_id), status: response.status ?? 'NEW' };
  }
}
