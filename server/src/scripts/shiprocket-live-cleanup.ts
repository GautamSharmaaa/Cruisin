// Governed by .rules v1.0
import { assertLiveMutationAllowed, logisticsConfig } from '../config/logistics.js';
import { getLogisticsProvider } from '../services/logistics/provider-factory.js';
import { logger } from '../utils/logger.js';

const argument = (name: string): string | undefined => {
  const prefix = `${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

const cleanup = async (): Promise<void> => {
  if (!process.argv.includes('--confirm-live-account')) throw new Error('Cleanup requires --confirm-live-account');
  if (logisticsConfig.mode !== 'live') throw new Error('Cleanup requires SHIPROCKET_MODE=live');
  assertLiveMutationAllowed();
  const testOrderId = argument('--test-order-id');
  const awb = argument('--awb');
  if (!testOrderId?.startsWith('CRUISIN-INTEGRATION-TEST-')) throw new Error('Cleanup is restricted to --test-order-id=CRUISIN-INTEGRATION-TEST-<timestamp>');
  if (!awb || !/^[A-Za-z0-9-]{6,80}$/.test(awb)) throw new Error('Provide the test shipment --awb');
  const result = await getLogisticsProvider().cancelShipment({ awb });
  logger.info('Confirmed live Shiprocket test cleanup completed', { testOrderId, cancelled: result.cancelled, status: result.status });
};

void cleanup().catch((error: unknown) => {
  logger.error('Confirmed live Shiprocket test cleanup failed', { error });
  process.exitCode = 1;
});
