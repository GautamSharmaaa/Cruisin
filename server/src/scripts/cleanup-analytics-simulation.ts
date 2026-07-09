// Governed by .rules v1.0
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { cleanupAnalyticsSimulation } from './seed-analytics-simulation.js';
import { logger } from '../utils/logger.js';

const assertSafeEnvironment = (): void => {
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
    throw new Error('Refusing to clean analytics QA data in production');
  }
};

const main = async (): Promise<void> => {
  assertSafeEnvironment();
  await connectDb();
  const batchId = process.env.ANALYTICS_QA_BATCH_ID;
  await cleanupAnalyticsSimulation(batchId);
  logger.info('Analytics QA simulation cleanup complete', { batchId: batchId ?? 'all analytics QA batches' });
  await disconnectDb();
};

main().catch(async (error) => {
  logger.error('Analytics QA cleanup failed', { error });
  if (mongoose.connection.readyState !== 0) await disconnectDb();
  process.exitCode = 1;
});
