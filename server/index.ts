// Governed by .rules v1.0
import type { Server } from 'node:http';
import { env } from './src/config/env.js';
import { createApp } from './src/app.js';
import { connectDb, disconnectDb } from './src/config/db.js';
import { connectRedis, redis } from './src/config/redis.js';
import { logger } from './src/utils/logger.js';
import { startDurableJobProcessor } from './src/services/durable-job-processor.js';

let server: Server | undefined;
let shuttingDown = false;
let stopDurableJobs: (() => void) | undefined;

const shutdown = async (signal: string, exitCode: number): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  stopDurableJobs?.();
  logger.info('API shutdown started', { signal });
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }
  const results = await Promise.allSettled([disconnectDb(), redis.quit()]);
  clearTimeout(forceExit);
  const failed = results.some((result) => result.status === 'rejected');
  if (failed) logger.error('API shutdown completed with dependency errors');
  process.exit(failed ? 1 : exitCode);
};

process.once('SIGTERM', () => { void shutdown('SIGTERM', 0); });
process.once('SIGINT', () => { void shutdown('SIGINT', 0); });
process.once('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
  void shutdown('unhandledRejection', 1);
});
process.once('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error });
  void shutdown('uncaughtException', 1);
});

const bootstrap = async (): Promise<void> => {
  await connectDb();
  await connectRedis();
  stopDurableJobs = startDurableJobProcessor();
  const app = createApp();
  server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info('Cruisin API listening', { host: '0.0.0.0', port: env.PORT, environment: env.NODE_ENV });
  });
};

void bootstrap().catch((error: unknown) => {
  logger.error('API bootstrap failed', { error });
  void shutdown('bootstrapFailure', 1);
});
