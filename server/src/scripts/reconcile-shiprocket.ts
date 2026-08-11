// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { LogisticsService } from '../services/logistics/logistics.service.js';
import { logger } from '../utils/logger.js';

const boundedInteger = (value: string | undefined, fallback: number, maximum: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const run = async (): Promise<void> => {
  if (process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS === 'true' || process.env.SHIPROCKET_MODE === 'live') {
    throw new Error('Reconciliation refuses to start while Shiprocket mutations are enabled');
  }
  const batchSize = boundedInteger(process.env.SHIPROCKET_RECONCILE_BATCH_SIZE, 25, 100);
  const concurrency = boundedInteger(process.env.SHIPROCKET_RECONCILE_CONCURRENCY, 3, 5);
  await connectDb();
  const summary = await LogisticsService.reconcileActiveShiprocketShipments({
    source: 'scheduled_reconciliation',
    limit: batchSize,
    concurrency
  });
  logger.info('Shiprocket reconciliation completed', {
    scanned: summary.scanned,
    changed: summary.changed,
    unchanged: summary.unchanged,
    failed: summary.failed,
    shiprocketMutations: 0
  });
  console.log(`Scanned: ${summary.scanned}`);
  console.log(`Changed: ${summary.changed}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log(`Failed: ${summary.failed}`);
  console.log('Shiprocket mutations: 0');
  if (summary.failed > 0) process.exitCode = 1;
};

void run()
  .catch((error: unknown) => {
    logger.error('Shiprocket reconciliation failed', { error: error instanceof Error ? error.message : 'unknown error' });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => undefined);
  });
