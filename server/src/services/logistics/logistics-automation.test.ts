// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createJob, mockedConfig } = vi.hoisted(() => ({
  createJob: vi.fn(),
  mockedConfig: { autoCreateOrder: false, autoCreateCodOrder: false, autoAssignAwb: true, autoSchedulePickup: true }
}));

vi.mock('../../config/logistics.js', () => ({ logisticsConfig: mockedConfig }));
vi.mock('../../models/logistics-job.model.js', () => ({ LogisticsJobModel: { create: createJob } }));

import { LogisticsAutomationService, shouldAutoCreateProviderOrder } from './logistics-automation.service.js';

describe('logistics automation chaining', () => {
  beforeEach(() => {
    createJob.mockReset();
    mockedConfig.autoCreateOrder = false;
    mockedConfig.autoCreateCodOrder = false;
    mockedConfig.autoAssignAwb = true;
    mockedConfig.autoSchedulePickup = true;
  });

  it('queues AWB only after confirmed measurements and courier selection', async () => {
    expect(await LogisticsAutomationService.afterProviderOrder({ _id: 'shipment-1', package: { measurementConfirmed: false }, courierId: 101 })).toBe(false);
    expect(await LogisticsAutomationService.afterProviderOrder({ _id: 'shipment-1', package: { measurementConfirmed: true } })).toBe(false);
    expect(createJob).not.toHaveBeenCalled();

    expect(await LogisticsAutomationService.afterProviderOrder({ _id: 'shipment-1', package: { measurementConfirmed: true }, courierId: 101 })).toBe(true);
    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ type: 'assign_awb', dedupeKey: 'auto-awb:shipment-1' }));
  });

  it('queues pickup only after AWB and tolerates duplicate retry claims', async () => {
    expect(await LogisticsAutomationService.afterAwb({ _id: 'shipment-1' })).toBe(false);
    createJob.mockRejectedValueOnce({ code: 11000 });
    await expect(LogisticsAutomationService.afterAwb({ _id: 'shipment-1', awb: 'MOCKAWB1' })).resolves.toBe(true);
    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ type: 'schedule_pickup', dedupeKey: 'auto-pickup:shipment-1' }));
  });

  it('leaves every step manual when its independent flag is false', async () => {
    mockedConfig.autoAssignAwb = false;
    mockedConfig.autoSchedulePickup = false;
    expect(await LogisticsAutomationService.afterProviderOrder({ _id: 'shipment-1', package: { measurementConfirmed: true }, courierId: 101 })).toBe(false);
    expect(await LogisticsAutomationService.afterAwb({ _id: 'shipment-1', awb: 'MOCKAWB1' })).toBe(false);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('keeps prepaid and COD provider-order creation independently controllable', () => {
    expect(shouldAutoCreateProviderOrder('online', { autoCreateOrder: false, autoCreateCodOrder: false })).toBe(false);
    expect(shouldAutoCreateProviderOrder('cod', { autoCreateOrder: false, autoCreateCodOrder: false })).toBe(false);
    expect(shouldAutoCreateProviderOrder('online', { autoCreateOrder: true, autoCreateCodOrder: false })).toBe(true);
    expect(shouldAutoCreateProviderOrder('partial', { autoCreateOrder: true, autoCreateCodOrder: false })).toBe(true);
    expect(shouldAutoCreateProviderOrder('cod', { autoCreateOrder: true, autoCreateCodOrder: false })).toBe(false);
    expect(shouldAutoCreateProviderOrder('online', { autoCreateOrder: false, autoCreateCodOrder: true })).toBe(false);
    expect(shouldAutoCreateProviderOrder('cod', { autoCreateOrder: false, autoCreateCodOrder: true })).toBe(true);
  });

  it.each([
    ['fully manual', false, false, false, false, false, false, false, false],
    ['automatic prepaid create only', true, false, false, false, true, false, false, false],
    ['automatic COD create only', false, true, false, false, false, true, false, false],
    ['auto-create and AWB', true, true, true, false, true, true, true, false],
    ['full mock automation', true, true, true, true, true, true, true, true]
  ])('enforces the %s flag matrix', async (
    _label,
    autoCreateOrder,
    autoCreateCodOrder,
    autoAssignAwb,
    autoSchedulePickup,
    expectPrepaid,
    expectCod,
    expectAwb,
    expectPickup
  ) => {
    mockedConfig.autoCreateOrder = autoCreateOrder;
    mockedConfig.autoCreateCodOrder = autoCreateCodOrder;
    mockedConfig.autoAssignAwb = autoAssignAwb;
    mockedConfig.autoSchedulePickup = autoSchedulePickup;
    expect(shouldAutoCreateProviderOrder('online', mockedConfig)).toBe(expectPrepaid);
    expect(shouldAutoCreateProviderOrder('cod', mockedConfig)).toBe(expectCod);
    expect(await LogisticsAutomationService.afterProviderOrder({
      _id: 'matrix-shipment',
      package: { measurementConfirmed: true },
      courierId: 101
    })).toBe(expectAwb);
    expect(await LogisticsAutomationService.afterAwb({
      _id: 'matrix-shipment',
      awb: 'MOCK-MATRIX-AWB'
    })).toBe(expectPickup);
  });
});
