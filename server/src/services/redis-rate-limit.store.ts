// Governed by .rules v1.0
import type { Options, Store } from 'express-rate-limit';
import { redis } from '../config/redis.js';

export class RedisRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const windowSeconds = Math.max(1, Math.ceil(this.windowMs / 1_000));
    const result = await redis.incrementWithExpiry(this.prefix + key, windowSeconds);
    const ttlSeconds = result.ttlSeconds > 0 ? result.ttlSeconds : windowSeconds;
    return {
      totalHits: result.totalHits,
      resetTime: new Date(Date.now() + ttlSeconds * 1_000)
    };
  }

  async decrement(key: string): Promise<void> {
    await redis.decr(this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(this.prefix + key);
  }
}
