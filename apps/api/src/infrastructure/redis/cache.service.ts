import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from './redis.module';

/**
 * Read-through cache for hot, rarely-changing data (cities, categories, business pages).
 * Callers own invalidation via {@link invalidate}.
 */
@Injectable()
export class CacheService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached !== null) return JSON.parse(cached) as T;
    const value = await load();
    if (value !== undefined && value !== null) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }
    return value;
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length) await this.redis.del(...keys);
  }
}
