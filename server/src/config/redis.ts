// Governed by .rules v1.0
import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

type RedisValue = string | null;

export interface RedisIncrementResult {
  totalHits: number;
  ttlSeconds: number;
}

export interface RedisClient {
  readonly status: string;
  connect: () => Promise<void>;
  ping: () => Promise<string>;
  get: (key: string) => Promise<RedisValue>;
  set: (key: string, value: string, mode?: 'EX', seconds?: number) => Promise<unknown>;
  del: (keyOrKeys: string | string[]) => Promise<number>;
  decr: (key: string) => Promise<number>;
  incrementWithExpiry: (key: string, seconds: number) => Promise<RedisIncrementResult>;
  quit: () => Promise<void>;
}

const rateLimitIncrementScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

const parseIncrementResult = (result: unknown): RedisIncrementResult => {
  if (!Array.isArray(result) || result.length !== 2) throw new Error('Redis returned an invalid rate-limit result');
  const totalHits = Number(result[0]);
  const ttlSeconds = Number(result[1]);
  if (!Number.isFinite(totalHits) || !Number.isFinite(ttlSeconds)) throw new Error('Redis returned a non-numeric rate-limit result');
  return { totalHits, ttlSeconds };
};

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
  decr: (key) => upstashCommand<number>(['DECR', key]),
  incrementWithExpiry: async (key, seconds) => parseIncrementResult(
    await upstashCommand<unknown>(['EVAL', rateLimitIncrementScript, 1, key, seconds])
  ),
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
    decr: (key) => client.decr(key),
    incrementWithExpiry: async (key, seconds) => parseIncrementResult(
      await client.eval(rateLimitIncrementScript, 1, key, seconds)
    ),
    quit: async (): Promise<void> => {
      if (client.status === 'wait' || client.status === 'end') return;
      await client.quit();
    }
  };
};

export const redis: RedisClient = env.REDIS_URL ? createIoredisClient() : createUpstashRedis();

export const connectRedis = async (): Promise<void> => {
  const attempts = env.NODE_ENV === 'test' ? 1 : 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (redis.status === 'wait') await redis.connect();
      await redis.ping();
      logger.info('Redis connected');
      return;
    } catch (error) {
      logger.error('Redis connection attempt failed', { attempt, attempts, error });
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(500 * (2 ** (attempt - 1)), 4_000)));
    }
  }
};
