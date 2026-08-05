// Governed by .rules v1.0
import { connectDb, disconnectDb } from './src/config/db.js';
import { env } from './src/config/env.js';
import { connectRedis, redis } from './src/config/redis.js';
import { LogisticsJobService } from './src/services/logistics/logistics-job.service.js';
import { logger } from './src/utils/logger.js';

let shuttingDown = false;
const wait = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Logistics worker shutdown started', { signal });
  await Promise.allSettled([disconnectDb(), redis.quit()]);
};

process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });

const bootstrap = async (): Promise<void> => {
  if (!env.LOGISTICS_WORKER_ENABLED) {
    logger.info('Logistics worker is disabled');
    return;
  }
  await connectDb();
  await connectRedis();
  logger.info('Logistics worker started', { pollMilliseconds: env.LOGISTICS_WORKER_POLL_MS });
  while (!shuttingDown) {
    const processed = await LogisticsJobService.processNext();
    if (!processed) await wait(env.LOGISTICS_WORKER_POLL_MS);
  }
};

void bootstrap().catch((error: unknown) => {
  logger.error('Logistics worker failed', { error });
  process.exitCode = 1;
});
