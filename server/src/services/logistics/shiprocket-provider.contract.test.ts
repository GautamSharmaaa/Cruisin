import { describe, expect, it, vi } from 'vitest';
import type { ShiprocketClient } from './shiprocket-client.js';
import { ShiprocketProvider } from './shiprocket-provider.js';

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
      if (path === '/shipments/555') return { data: { id: 555, order_id: 444, awb: 'AWB-READ-ONLY', courier_name: 'Contract Courier', courier_id: 42, status_name: 'Pickup Scheduled', pickup_status: 'Scheduled', pickup_scheduled_date: '2026-08-11T12:00:00.000Z', etd: '2026-08-14' } };
      if (path === '/orders/show/444') return { data: { id: 444, shipments: [{ id: 555, order_id: 444, awb: 'AWB-READ-ONLY' }] } };
      if (path === '/courier/track/awb/AWB-READ-ONLY') return { tracking_data: { shipment_status: 18, shipment_track: [{ awb_code: 'AWB-READ-ONLY', courier_name: 'Contract Courier', current_status: 'In Transit', etd: '2026-08-14' }], shipment_track_activities: [{ date: '2026-08-11T13:00:00.000Z', status: 'In Transit', activity: 'Shipment moving', location: 'Bengaluru', 'sr-status': 18 }] } };
      throw new Error(`Unexpected read path: ${path}`);
    });
    const post = vi.fn(() => { throw new Error('Mutation attempted'); });
    const provider = new ShiprocketProvider({ get, post } as unknown as ShiprocketClient);

    const result = await provider.reconcileShipment({ providerOrderId: '444', providerShipmentId: '555' });

    expect(result).toMatchObject({ providerOrderId: '444', providerShipmentId: '555', awb: 'AWB-READ-ONLY', courierName: 'Contract Courier', status: 'in_transit', pickupStatus: 'Scheduled', estimatedDelivery: '2026-08-14' });
    expect(result.scans).toEqual([expect.objectContaining({ status: 'in_transit', location: 'Bengaluru' })]);
    expect(get.mock.calls.map(([path]) => path)).toEqual(['/shipments/555', '/orders/show/444', '/courier/track/awb/AWB-READ-ONLY']);
    expect(post).not.toHaveBeenCalled();
  });
});
