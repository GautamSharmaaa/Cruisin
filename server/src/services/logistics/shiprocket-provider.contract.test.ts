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
});
