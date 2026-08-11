// Governed by .rules v1.0
import { env } from '../config/env.js';
import { logisticsConfig } from '../config/logistics.js';
import { getLogisticsProvider } from '../services/logistics/provider-factory.js';
import type { CourierRate } from '../types/logistics.types.js';

const argument = (name: string): string | undefined => {
  const prefix = `${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};
const confirmationFlag = '--confirm-read-only-account';
const allowedArguments = new Set([confirmationFlag, '--delivery-postcode']);
const safeErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Read-only validation failed')
  .replace(/(token|password|secret|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
  .slice(0, 300);
const finiteNonnegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const validExpectedDelivery = (courier: CourierRate): boolean => (
  (courier.estimatedDeliveryDays !== undefined && Number.isFinite(courier.estimatedDeliveryDays) && courier.estimatedDeliveryDays >= 0)
  || (courier.estimatedDeliveryDate !== undefined && Number.isFinite(Date.parse(courier.estimatedDeliveryDate)))
);
const validateCouriers = (couriers: CourierRate[], paymentMode: 'prepaid' | 'cod'): void => {
  if (couriers.length === 0) throw new Error(`Shiprocket returned no ${paymentMode} couriers`);
  const ids = new Set<number>();
  for (const courier of couriers) {
    if (!Number.isInteger(courier.courierId) || courier.courierId <= 0) throw new Error('Shiprocket returned an invalid courier ID');
    if (!courier.courierName.trim()) throw new Error('Shiprocket returned an empty courier name');
    if (ids.has(courier.courierId)) throw new Error('Shiprocket returned a duplicate courier ID');
    ids.add(courier.courierId);
    if (![courier.freightCharge, courier.codCharge, courier.totalCharge].every(finiteNonnegative)) {
      throw new Error('Shiprocket returned malformed INR charge fields');
    }
    if (Math.abs(courier.totalCharge - (courier.freightCharge + courier.codCharge)) > 0.01) {
      throw new Error('Shiprocket courier total does not equal freight plus COD charges');
    }
    if (paymentMode === 'prepaid' && courier.codCharge !== 0) throw new Error('Prepaid courier unexpectedly includes a COD charge');
    if (paymentMode === 'cod' && !courier.codAvailable) throw new Error('COD query returned a courier without COD availability');
    if (!validExpectedDelivery(courier)) throw new Error('Shiprocket courier is missing a valid expected-delivery field');
  }
};
const assertReadOnlyInvocation = (): string => {
  if (!process.argv.includes(confirmationFlag)) {
    throw new Error(`Add ${confirmationFlag} after manually confirming these credentials belong to the intended read-only account`);
  }
  for (const value of process.argv.slice(2).filter((candidate) => candidate.startsWith('--'))) {
    const name = value.split('=')[0];
    if (!allowedArguments.has(name)) throw new Error(`Unsupported smoke-test argument: ${name}`);
  }
  if (!logisticsConfig.enabled) throw new Error('Read-only smoke requires SHIPROCKET_ENABLED=true');
  if (logisticsConfig.mode !== 'live-readonly') throw new Error('Read-only smoke requires SHIPROCKET_MODE=live-readonly');
  if (!env.SHIPROCKET_ALLOW_LIVE_READS) throw new Error('Read-only smoke requires SHIPROCKET_ALLOW_LIVE_READS=true');
  if (env.SHIPROCKET_ALLOW_LIVE_DOCUMENTS) throw new Error('Read-only smoke refuses SHIPROCKET_ALLOW_LIVE_DOCUMENTS=true');
  if (env.SHIPROCKET_ALLOW_LIVE_MUTATIONS) throw new Error('Read-only smoke refuses SHIPROCKET_ALLOW_LIVE_MUTATIONS=true');
  if (logisticsConfig.autoCreateOrder || logisticsConfig.autoCreateCodOrder || logisticsConfig.autoAssignAwb || logisticsConfig.autoSchedulePickup || logisticsConfig.workerEnabled) {
    throw new Error('Disable every logistics automation and worker flag before the read-only smoke test');
  }
  const deliveryPostcode = argument('--delivery-postcode');
  if (!deliveryPostcode || !/^[1-9]\d{5}$/.test(deliveryPostcode)) throw new Error('Provide --delivery-postcode=NNNNNN');
  if (!logisticsConfig.pickupLocation || !logisticsConfig.pickupPostcode) throw new Error('Shiprocket pickup location and postcode are required');
  return deliveryPostcode;
};

const smoke = async (): Promise<void> => {
  const deliveryPostcode = assertReadOnlyInvocation();
  const provider = getLogisticsProvider();
  await provider.authenticate();
  await provider.validatePickupLocation(logisticsConfig.pickupLocation!, logisticsConfig.pickupPostcode!);
  const route = {
    pickupPostcode: logisticsConfig.pickupPostcode!,
    deliveryPostcode,
    weightKg: 0.5,
    lengthCm: 20,
    breadthCm: 15,
    heightCm: 5,
    declaredValue: 1_000
  };
  if (route.weightKg <= 0 || route.lengthCm <= 0 || route.breadthCm <= 0 || route.heightCm <= 0 || route.declaredValue <= 0) {
    throw new Error('Smoke-test kg, cm, or INR input contract is invalid');
  }
  const [prepaid, cod] = await Promise.all([
    provider.getRates({ ...route, paymentMode: 'prepaid' }),
    provider.getRates({ ...route, paymentMode: 'cod' })
  ]);
  if (!prepaid.serviceable) throw new Error('Shiprocket route is not serviceable for prepaid');
  if (!cod.serviceable) throw new Error('Shiprocket route is not serviceable for COD');
  validateCouriers(prepaid.couriers, 'prepaid');
  validateCouriers(cod.couriers, 'cod');
  console.info(JSON.stringify({
    ok: true,
    mode: 'live-readonly',
    authentication: 'valid',
    pickupLocation: 'validated',
    serviceability: { prepaid: true, cod: true },
    responseSchema: 'valid',
    units: { money: 'INR', weight: 'kg', dimensions: 'cm' },
    courierCounts: { prepaid: prepaid.couriers.length, cod: cod.couriers.length },
    expectedDeliveryFields: 'valid'
  }));
};

void smoke().catch((error: unknown) => {
  console.error(`Shiprocket read-only smoke failed: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
