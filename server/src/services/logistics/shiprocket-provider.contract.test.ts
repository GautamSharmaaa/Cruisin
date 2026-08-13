import { describe, expect, it, vi } from 'vitest';
import type { ShiprocketClient } from './shiprocket-client.js';
import { ShiprocketProvider } from './shiprocket-provider.js';

const mutationOrderInput = {
  localOrderId: '66b000000000000000000001',
  sourceOrderId: 'CR-CONTRACT-MUTATION',
  orderDate: new Date('2026-08-11T08:00:00.000Z'),
  pickupLocation: 'Contract Warehouse',
  address: {
    name: 'Contract Customer',
    phone: '9000000000',
    address: '1 Contract Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postcode: '560001'
  },
  items: [{ name: 'Contract Tee', sku: 'CONTRACT-TEE-M', units: 1, sellingPrice: 1_000, discount: 50, tax: 0 }],
  paymentMode: 'prepaid' as const,
  subtotal: 950,
  shippingCharge: 92,
  totalDiscount: 50,
  total: 1_042,
  package: {
    productWeightKg: 0.4,
    packagingWeightKg: 0.1,
    deadWeightKg: 0.5,
    lengthCm: 20,
    breadthCm: 15,
    heightCm: 5,
    measurementConfirmed: true,
    warnings: []
  }
};

describe('ShiprocketProvider live response compatibility', () => {
  it('normalizes the numeric mode returned by the live serviceability API', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          available_courier_companies: [
            {
              courier_company_id: 42,
              courier_name: 'Contract Courier',
              rate: 75,
              cod_charges: 0,
              estimated_delivery_days: '3',
              mode: 1,
              is_surface: true,
              cod: 0
            }
          ]
        }
      })
    } as unknown as ShiprocketClient;
    const provider = new ShiprocketProvider(client);

    const result = await provider.getRates({
      pickupPostcode: '110037',
      deliveryPostcode: '560001',
      paymentMode: 'prepaid',
      weightKg: 0.5,
      lengthCm: 20,
      breadthCm: 15,
      heightCm: 5,
      declaredValue: 1_000
    });

    expect(result.couriers).toEqual([
      expect.objectContaining({
        courierId: 42,
        shippingMode: 'surface',
        estimatedDeliveryDays: 3,
        totalCharge: 75
      })
    ]);
  });

  it('reconciles external Shiprocket changes using GET requests only', async () => {
    const get = vi.fn(async (path: string) => {
      if (path === '/shipments/555') return { data: { id: 555, order_id: 444, awb: 'AWB-READ-ONLY', courier_name: 'Contract Courier', courier_id: 42, status_name: 'Pickup Scheduled', pickup_status: 'Scheduled', pickup_scheduled_date: '2026-08-11T12:00:00.000Z', etd: '2026-08-14', shipping_mode: 'Surface', freight_charges: 82, cod_charges: 18, other_charges: 4, charged_weight: 0.75 } };
      if (path === '/orders/show/444') return { data: { id: 444, shipments: [{ id: 555, order_id: 444, awb: 'AWB-READ-ONLY' }] } };
      if (path === '/courier/track/awb/AWB-READ-ONLY') return { tracking_data: { shipment_status: 18, shipment_track: [{ awb_code: 'AWB-READ-ONLY', courier_name: 'Contract Courier', current_status: 'In Transit', etd: '2026-08-14' }], shipment_track_activities: [{ date: '2026-08-11T13:00:00.000Z', status: 'In Transit', activity: 'Shipment moving', location: 'Bengaluru', 'sr-status': 18 }] } };
      if (path === '/account/details/statement') return { data: [
        { awb_code: 'AWB-READ-ONLY', action: 'Forward Freight Charges', debit_amount: '106.36', credit_amount: '', billed_weight: '0.8' },
        { awb_code: 'AWB-READ-ONLY', action: 'COD Charges', debit_amount: '12.50', credit_amount: '' },
        { awb_code: 'OTHER-AWB', action: 'Forward Freight Charges', debit_amount: '999', credit_amount: '' }
      ] };
      throw new Error(`Unexpected read path: ${path}`);
    });
    const post = vi.fn(() => { throw new Error('Mutation attempted'); });
    const provider = new ShiprocketProvider({ get, post } as unknown as ShiprocketClient);

    const result = await provider.reconcileShipment({ providerOrderId: '444', providerShipmentId: '555' });

    expect(result).toMatchObject({ providerOrderId: '444', providerShipmentId: '555', awb: 'AWB-READ-ONLY', courierName: 'Contract Courier', status: 'in_transit', pickupStatus: 'Scheduled', estimatedDelivery: '2026-08-14', shippingMode: 'surface', providerShippingCost: 82, codCharge: 18, otherProviderCharges: 4, chargedWeightKg: 0.8, providerBilledFreightCost: 106.36, providerBilledCodCharge: 12.5, providerBilledTotal: 118.86, providerBillingStatus: 'current', providerBillingSource: 'statement' });
    expect(result.scans).toEqual([expect.objectContaining({ status: 'in_transit', location: 'Bengaluru' })]);
    expect(get.mock.calls.map(([path]) => path)).toEqual(['/shipments/555', '/orders/show/444', '/courier/track/awb/AWB-READ-ONLY', '/account/details/statement']);
    expect(post).not.toHaveBeenCalled();
  });

  it('finds billed freight charges beyond the first Shiprocket statement page', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      awb_code: `OTHER-AWB-${index}`,
      action: 'Forward Freight Charges',
      debit_amount: '99.00'
    }));
    const get = vi.fn(async (path: string, _schema?: unknown, params?: Record<string, number>) => {
      if (path === '/shipments/555') return { data: { id: 555, order_id: 444, awb: 'AWB-PAGE-TWO', status_name: 'In Transit', freight_charges: 82 } };
      if (path === '/orders/show/444') return { data: { id: 444, shipments: [{ id: 555, awb: 'AWB-PAGE-TWO' }] } };
      if (path === '/courier/track/awb/AWB-PAGE-TWO') return { tracking_data: { shipment_track: [{ awb_code: 'AWB-PAGE-TWO', current_status: 'In Transit' }], shipment_track_activities: [] } };
      if (path === '/account/details/statement' && params?.page === 1) return { data: firstPage };
      if (path === '/account/details/statement' && params?.page === 2) return { data: [{ awb_code: 'AWB-PAGE-TWO', action: 'Forward Freight Charges', debit_amount: '106.36', billed_weight: '0.8' }] };
      throw new Error(`Unexpected read path: ${path}`);
    });
    const provider = new ShiprocketProvider({ get } as unknown as ShiprocketClient);

    const result = await provider.reconcileShipment({ providerOrderId: '444', providerShipmentId: '555' });

    expect(result).toMatchObject({
      providerShippingCost: 82,
      providerBilledFreightCost: 106.36,
      providerBilledTotal: 106.36,
      providerBillingStatus: 'current',
      providerBillingSource: 'statement'
    });
    expect(get.mock.calls.filter(([path]) => path === '/account/details/statement').map(([, , params]) => params?.page)).toEqual([1, 2]);
  });

  it('classifies label and invoice calls as scoped document operations', async () => {
    const post = vi.fn(async (path: string, _body?: unknown, _schema?: unknown, _operation?: string) => path.includes('label')
      ? { label_url: 'https://documents.example.test/label.pdf' }
      : { invoice_url: 'https://documents.example.test/invoice.pdf' });
    const provider = new ShiprocketProvider({ post } as unknown as ShiprocketClient);

    await provider.generateLabel({ providerShipmentId: '555' });
    await provider.generateInvoice({ providerOrderId: '444' });

    expect(post.mock.calls[0]?.[0]).toBe('/courier/generate/label');
    expect(post.mock.calls[0]?.[3]).toBe('document');
    expect(post.mock.calls[1]?.[0]).toBe('/orders/print/invoice');
    expect(post.mock.calls[1]?.[3]).toBe('document');
  });

  it('uses the exact guarded Shiprocket mutation endpoints and provider payload shapes', async () => {
    const post = vi.fn(async (path: string, _body?: unknown, _schema?: unknown, _operation?: string) => {
      if (path === '/orders/create/adhoc') return { order_id: 444, shipment_id: 555, status: 'NEW' };
      if (path === '/courier/assign/awb') return { response: { data: { awb_code: 'AWB-CONTRACT', courier_company_id: 42, courier_name: 'Contract Courier' } } };
      if (path === '/courier/generate/pickup') return { pickup_status: 1, response: { pickup_scheduled_date: '2026-08-11T12:00:00.000Z', status: 'Pickup Scheduled' } };
      if (path === '/manifests/generate') return { manifest_url: 'https://documents.example.test/manifest.pdf' };
      if (path === '/orders/cancel/shipment/awbs') return { message: 'Shipment cancelled' };
      if (path === '/shipments/create/return-shipment') return { order_id: 777, shipment_id: 888, status: 'NEW' };
      throw new Error(`Unexpected mutation path: ${path}`);
    });
    const provider = new ShiprocketProvider({ post } as unknown as ShiprocketClient);

    await expect(provider.createOrder(mutationOrderInput)).resolves.toMatchObject({ providerOrderId: '444', providerShipmentId: '555' });
    await expect(provider.assignCourier({ providerShipmentId: '555', courierId: 42 })).resolves.toMatchObject({ awb: 'AWB-CONTRACT', courierId: 42 });
    await expect(provider.schedulePickup({ providerShipmentId: '555' })).resolves.toMatchObject({ pickupScheduled: true, status: 'Pickup Scheduled' });
    await expect(provider.generateManifest({ providerShipmentId: '555' })).resolves.toMatchObject({ url: 'https://documents.example.test/manifest.pdf' });
    await expect(provider.cancelShipment({ awb: 'AWB-CONTRACT' })).resolves.toMatchObject({ cancelled: true });
    await expect(provider.createReturn({ ...mutationOrderInput, sourceOrderId: 'CR-CONTRACT-RETURN', returnReason: 'Contract return' })).resolves.toMatchObject({ providerOrderId: '777', providerShipmentId: '888' });

    expect(post.mock.calls.map(([path, body, , operation]) => ({ path, body, operation }))).toEqual([
      expect.objectContaining({ path: '/orders/create/adhoc', body: expect.objectContaining({ order_id: 'CR-CONTRACT-MUTATION', pickup_location: 'Contract Warehouse', payment_method: 'Prepaid', sub_total: 950, weight: 0.5 }), operation: undefined }),
      { path: '/courier/assign/awb', body: { shipment_id: 555, courier_id: 42 }, operation: undefined },
      { path: '/courier/generate/pickup', body: { shipment_id: [555] }, operation: undefined },
      { path: '/manifests/generate', body: { shipment_id: [555] }, operation: undefined },
      { path: '/orders/cancel/shipment/awbs', body: { awbs: ['AWB-CONTRACT'] }, operation: undefined },
      expect.objectContaining({ path: '/shipments/create/return-shipment', body: expect.objectContaining({ order_id: 'CR-CONTRACT-RETURN', return_reason: 'Contract return', pickup_pincode: 560001 }), operation: undefined })
    ]);
  });
});
