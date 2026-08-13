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
  ReconcileShipmentInput,
  ReconcileShipmentResult,
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
const providerDetailsSchema = z.record(z.unknown());
const STATEMENT_PAGE_SIZE = 200;
const MAX_STATEMENT_PAGES = 100;

type UnknownRecord = Record<string, unknown>;
const asRecord = (value: unknown): UnknownRecord | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : undefined;
const recordValue = (record: UnknownRecord | undefined, keys: string[]): unknown => keys.map((key) => record?.[key]).find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
const stringValue = (record: UnknownRecord | undefined, keys: string[]): string | undefined => {
  const candidate = recordValue(record, keys);
  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : undefined;
};
const numericValue = (record: UnknownRecord | undefined, keys: string[]): number | undefined => {
  const candidate = Number(recordValue(record, keys));
  return Number.isFinite(candidate) ? candidate : undefined;
};
const nonnegativeValue = (record: UnknownRecord | undefined, keys: string[]): number | undefined => {
  const candidate = numericValue(record, keys);
  return candidate !== undefined && candidate >= 0 ? candidate : undefined;
};
const statementRows = (response: UnknownRecord): UnknownRecord[] => Array.isArray(response.data)
  ? response.data.map(asRecord).filter((row): row is UnknownRecord => Boolean(row))
  : [];
const statementLastPage = (response: UnknownRecord): number | undefined => {
  const meta = asRecord(response.meta);
  const pagination = asRecord(response.pagination);
  const candidate = [response.last_page, meta?.last_page, pagination?.last_page]
    .map(Number)
    .find((value) => Number.isInteger(value) && value > 0);
  return candidate;
};
const dataRecord = (response: UnknownRecord): UnknownRecord => asRecord(response.data) ?? response;
const shipmentRecord = (order: UnknownRecord, expectedShipmentId?: string): UnknownRecord | undefined => {
  const shipments = Array.isArray(order.shipments) ? order.shipments.map(asRecord).filter((item): item is UnknownRecord => Boolean(item)) : [];
  if (!expectedShipmentId) return shipments[0];
  return shipments.find((shipment) => stringValue(shipment, ['id', 'shipment_id']) === expectedShipmentId) ?? shipments[0];
};

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const statementAmount = (record: UnknownRecord, key: 'debit_amount' | 'credit_amount'): number => {
  const value = numericValue(record, [key]);
  return value !== undefined && value >= 0 ? value : 0;
};
const statementChargesForAwb = (response: UnknownRecord, awb: string): Pick<ReconcileShipmentResult,
  'providerBilledFreightCost' | 'providerBilledCodCharge' | 'providerBilledOtherCharges' | 'providerBilledRtoCost' |
  'providerBilledTotal' | 'providerBillingStatus' | 'providerBillingSource' | 'chargedWeightKg'> | undefined => {
  const rows = statementRows(response);
  const matching = rows.filter((row) => [stringValue(row, ['awb_code']), stringValue(row, ['return_awb_code'])].includes(awb));
  if (!matching.length) return undefined;
  const totals = { freight: 0, cod: 0, other: 0, rto: 0 };
  for (const row of matching) {
    const net = statementAmount(row, 'debit_amount') - statementAmount(row, 'credit_amount');
    if (!net) continue;
    const description = [stringValue(row, ['action']), stringValue(row, ['charge']), stringValue(row, ['description'])]
      .filter(Boolean).join(' ').toLowerCase();
    if (/\b(rto|return)\b/.test(description)) totals.rto += net;
    else if (/\bcod\b|cash on delivery/.test(description)) totals.cod += net;
    else if (/freight|shipping|forward/.test(description)) totals.freight += net;
    else totals.other += net;
  }
  const providerBilledFreightCost = money(Math.max(0, totals.freight));
  const providerBilledCodCharge = money(Math.max(0, totals.cod));
  const providerBilledOtherCharges = money(Math.max(0, totals.other));
  const providerBilledRtoCost = money(Math.max(0, totals.rto));
  const providerBilledTotal = money(providerBilledFreightCost + providerBilledCodCharge + providerBilledOtherCharges + providerBilledRtoCost);
  if (!providerBilledTotal) return undefined;
  const chargedWeightKg = matching.map((row) => nonnegativeValue(row, ['billed_weight', 'charged_weight', 'applied_weight'])).find((value) => value !== undefined);
  return {
    providerBilledFreightCost,
    providerBilledCodCharge,
    providerBilledOtherCharges,
    providerBilledRtoCost,
    providerBilledTotal,
    chargedWeightKg,
    providerBillingStatus: 'current',
    providerBillingSource: 'statement'
  };
};

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
  private readonly statementCache = new Map<string, { expiresAt: number; value: Promise<UnknownRecord> }>();

  public constructor(private readonly client = new ShiprocketClient()) {}

  private statement(input: ReconcileShipmentInput): Promise<UnknownRecord> {
    const today = new Date();
    const fromDate = input.createdAt ? new Date(input.createdAt) : new Date(today.getTime() - 30 * 86_400_000);
    if (Number.isNaN(fromDate.getTime())) fromDate.setTime(today.getTime() - 30 * 86_400_000);
    fromDate.setUTCDate(fromDate.getUTCDate() - 2);
    const toDate = new Date(today.getTime() + 86_400_000);
    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    const cacheKey = `${from}:${to}`;
    const cached = this.statementCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const load = async (): Promise<UnknownRecord> => {
      const first = await this.client.get('/account/details/statement', providerDetailsSchema, { page: 1, per_page: STATEMENT_PAGE_SIZE, from, to });
      const rows = statementRows(first);
      const declaredLastPage = statementLastPage(first);
      let page = 1;
      let latestPageSize = rows.length;
      while ((declaredLastPage ? page < declaredLastPage : latestPageSize === STATEMENT_PAGE_SIZE) && page < MAX_STATEMENT_PAGES) {
        page += 1;
        const response = await this.client.get('/account/details/statement', providerDetailsSchema, { page, per_page: STATEMENT_PAGE_SIZE, from, to });
        const nextRows = statementRows(response);
        rows.push(...nextRows);
        latestPageSize = nextRows.length;
      }
      if ((declaredLastPage && page < declaredLastPage) || (!declaredLastPage && latestPageSize === STATEMENT_PAGE_SIZE)) {
        throw new LogisticsProviderError('permanent_provider', 'Shiprocket statement exceeded the safe reconciliation page limit', false, 502);
      }
      return { ...first, data: rows };
    };
    const value = load();
    this.statementCache.set(cacheKey, { expiresAt: Date.now() + 60_000, value });
    void value.catch(() => this.statementCache.delete(cacheKey));
    return value;
  }

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
    const response = await this.client.post('/courier/generate/label', { shipment_id: [Number(input.providerShipmentId)] }, documentSchema, 'document');
    if (!response.label_url) throw new LogisticsProviderError('permanent_provider', 'Provider did not return a label', false);
    return { url: response.label_url, generatedAt: new Date().toISOString() };
  }

  public async generateInvoice(input: DocumentInput): Promise<DocumentResult> {
    if (!input.providerOrderId) throw new LogisticsProviderError('invalid_payload', 'Provider order ID is required', false, 400);
    const response = await this.client.post('/orders/print/invoice', { ids: [Number(input.providerOrderId)] }, documentSchema, 'document');
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
    if (!input.awb && !input.providerShipmentId) throw new LogisticsProviderError('invalid_payload', 'AWB or provider shipment ID is required for tracking', false, 400);
    const path = input.awb
      ? `/courier/track/awb/${encodeURIComponent(input.awb)}`
      : `/courier/track/shipment/${encodeURIComponent(input.providerShipmentId!)}`;
    const response = await this.client.get(path, trackingSchema);
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

  public async reconcileShipment(input: ReconcileShipmentInput): Promise<ReconcileShipmentResult> {
    if (!input.providerOrderId && !input.providerShipmentId) {
      throw new LogisticsProviderError('invalid_payload', 'Provider order or shipment ID is required for reconciliation', false, 400);
    }
    const requests: Array<Promise<UnknownRecord>> = [];
    if (input.providerShipmentId) requests.push(this.client.get(`/shipments/${encodeURIComponent(input.providerShipmentId)}`, providerDetailsSchema));
    if (input.providerOrderId) requests.push(this.client.get(`/orders/show/${encodeURIComponent(input.providerOrderId)}`, providerDetailsSchema));
    const responses = await Promise.allSettled(requests);
    const successful = responses.flatMap((response) => response.status === 'fulfilled' ? [dataRecord(response.value)] : []);
    if (successful.length === 0) {
      const failure = responses.find((response): response is PromiseRejectedResult => response.status === 'rejected');
      throw failure?.reason ?? new LogisticsProviderError('temporary_provider', 'Provider reconciliation reads failed', true, 503);
    }
    const directShipment = successful.find((record) => stringValue(record, ['shipment_id', 'id']) === input.providerShipmentId);
    const order = successful.find((record) => Array.isArray(record.shipments));
    const shipment = directShipment ?? (order ? shipmentRecord(order, input.providerShipmentId) : undefined) ?? successful[0];
    const providerOrderId = stringValue(order, ['id', 'order_id']) ?? stringValue(shipment, ['order_id']) ?? input.providerOrderId;
    const providerShipmentId = stringValue(shipment, ['id', 'shipment_id']) ?? input.providerShipmentId;
    const awb = stringValue(shipment, ['awb', 'awb_code']) ?? input.awb;
    const courierName = stringValue(shipment, ['courier_name', 'courier']);
    const courierId = numericValue(shipment, ['courier_id', 'courier_company_id']);
    const providerStatusId = numericValue(shipment, ['status_code', 'status_id', 'status']);
    const rawStatus = stringValue(shipment, ['status_name', 'current_status'])
      ?? (typeof shipment.status === 'string' ? shipment.status : undefined)
      ?? stringValue(order, ['status_name', 'status'])
      ?? 'Unknown';
    const pickupDate = stringValue(shipment, ['pickup_scheduled_date', 'pickup_date']);
    const pickupStatus = stringValue(shipment, ['pickup_status']) ?? (pickupDate ? 'Pickup Scheduled' : undefined);
    const estimatedDelivery = stringValue(shipment, ['etd', 'estimated_delivery_date', 'expected_delivery_date']);
    const rawShippingMode = recordValue(shipment, ['shipping_mode', 'mode', 'is_surface']);
    const normalizedShippingMode = String(rawShippingMode ?? '').toLowerCase();
    const shippingMode = normalizedShippingMode.includes('air') || rawShippingMode === false
      ? 'air' as const
      : normalizedShippingMode.includes('surface') || rawShippingMode === true
        ? 'surface' as const
        : undefined;
    const providerShippingCost = nonnegativeValue(shipment, ['freight_charges', 'freight_charge', 'shipping_charges', 'shipping_charge', 'rate']);
    const codCharge = nonnegativeValue(shipment, ['cod_charges', 'cod_charge']);
    const chargedWeightKg = nonnegativeValue(shipment, ['charged_weight', 'chargeable_weight']);
    const otherProviderCharges = nonnegativeValue(shipment, ['other_charges', 'additional_charges']);
    const rtoCost = nonnegativeValue(shipment, ['rto_charges', 'rto_charge']);
    let tracking: TrackingResult | undefined;
    if (awb || providerShipmentId) {
      try {
        tracking = await this.trackShipment({ awb, providerShipmentId, providerOrderId });
      } catch {
        tracking = undefined;
      }
    }
    let billing: ReturnType<typeof statementChargesForAwb>;
    const billingAwb = tracking?.awb ?? awb;
    if (billingAwb) {
      try {
        billing = statementChargesForAwb(await this.statement(input), billingAwb);
      } catch {
        billing = undefined;
      }
    }
    return {
      providerOrderId,
      providerShipmentId,
      awb: tracking?.awb ?? awb,
      courierId,
      courierName: tracking?.courierName ?? courierName,
      pickupStatus,
      pickupDate,
      providerStatusId,
      status: tracking?.status ?? normalizeShipmentStatus(rawStatus, providerStatusId),
      rawStatus: tracking?.rawStatus ?? rawStatus,
      estimatedDelivery: tracking?.estimatedDelivery ?? estimatedDelivery,
      shippingMode,
      providerShippingCost,
      codCharge,
      chargedWeightKg,
      otherProviderCharges,
      rtoCost,
      ...billing,
      scans: tracking?.scans ?? []
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
