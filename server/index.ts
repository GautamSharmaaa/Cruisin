// Governed by .rules v1.0
import { env } from './src/config/env.js';
import { createApp } from './src/app.js';
import { connectDb, disconnectDb } from './src/config/db.js';
import { connectRedis, redis } from './src/config/redis.js';
import { logger } from './src/utils/logger.js';

const bootstrap = async (): Promise<void> => {
  await connectDb();
  await connectRedis();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info('Cruisin API listening', { port: env.PORT, environment: env.NODE_ENV });
  });
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('API shutdown started', { signal });
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(() => {
      void Promise.allSettled([disconnectDb(), redis.quit()]).then((results) => {
        clearTimeout(forceExit);
        const failed = results.some((result) => result.status === 'rejected');
        if (failed) logger.error('API shutdown completed with dependency errors');
        process.exit(failed ? 1 : 0);
      });
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

void bootstrap().catch((error: unknown) => {
  logger.error('API bootstrap failed', { error });
  process.exit(1);
});
