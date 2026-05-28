// Governed by .rules v1.0
import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

export const connectRedis = async (): Promise<void> => {
  if (redis.status !== 'ready') {
    await redis.connect();
  }
  logger.info('Redis connected');
};
