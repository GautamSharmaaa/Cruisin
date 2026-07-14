// Governed by .rules v1.0
import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

type RedisValue = string | null;

interface RedisClient {
  readonly status: string;
  connect: () => Promise<void>;
  ping: () => Promise<string>;
  get: (key: string) => Promise<RedisValue>;
  set: (key: string, value: string, mode?: 'EX', seconds?: number) => Promise<unknown>;
  del: (keyOrKeys: string | string[]) => Promise<number>;
  quit: () => Promise<void>;
}

const upstashCommand = async <T>(command: unknown[]): Promise<T> => {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Upstash Redis is not configured');
  const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const body = await response.json() as { result?: T; error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? 'Upstash Redis request failed');
  return body.result as T;
};

const createUpstashRedis = (): RedisClient => ({
  status: 'ready',
  connect: async (): Promise<void> => {
    await upstashCommand(['PING']);
  },
  ping: () => upstashCommand<string>(['PING']),
  get: (key) => upstashCommand<RedisValue>(['GET', key]),
  set: (key, value, mode, seconds) => mode === 'EX' && seconds
    ? upstashCommand(['SET', key, value, 'EX', seconds])
    : upstashCommand(['SET', key, value]),
  del: async (keyOrKeys) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (keys.length === 0) return 0;
    return upstashCommand<number>(['DEL', ...keys]);
  },
  quit: async (): Promise<void> => undefined
});

const createIoredisClient = (): RedisClient => {
  if (!env.REDIS_URL) throw new Error('REDIS_URL is not configured');
  const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  return {
    get status() {
      return client.status;
    },
    connect: async (): Promise<void> => {
      await client.connect();
    },
    ping: () => client.ping(),
    get: (key) => client.get(key),
    set: (key, value, mode, seconds) => mode === 'EX' && seconds
      ? client.set(key, value, 'EX', seconds)
      : client.set(key, value),
    del: (keyOrKeys) => Array.isArray(keyOrKeys) ? client.del(...keyOrKeys) : client.del(keyOrKeys),
    quit: async (): Promise<void> => {
      await client.quit();
    }
  };
};

export const redis: RedisClient = env.REDIS_URL ? createIoredisClient() : createUpstashRedis();

export const connectRedis = async (): Promise<void> => {
  if (redis.status !== 'ready') {
    await redis.connect();
  } else if (!env.REDIS_URL) {
    await redis.connect();
  }
  logger.info('Redis connected');
};
