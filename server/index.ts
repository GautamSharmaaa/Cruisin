// Governed by .rules v1.0
import { env } from './src/config/env.js';
import { createApp } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import { logger } from './src/utils/logger.js';

const bootstrap = async (): Promise<void> => {
  await connectDb();
  await connectRedis();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info('Cruisin API listening', { port: env.PORT, environment: env.NODE_ENV });
  });
};

void bootstrap().catch((error: unknown) => {
  logger.error('API bootstrap failed', { error });
  process.exit(1);
});
