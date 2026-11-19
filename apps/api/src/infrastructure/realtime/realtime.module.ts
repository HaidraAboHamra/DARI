import { Global, Inject, Injectable, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { REDIS } from '../redis/redis.module';

export interface RealtimeEvent {
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

const channel = (userId: string) => `rt:user:${userId}`;

/** Publishes per-user events to Redis (works from the API and the worker alike). */
@Injectable()
export class RealtimePublisher {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async publish(userIds: string[], event: RealtimeEvent): Promise<void> {
    if (!userIds.length) return;
    const payload = JSON.stringify(event);
    const pipeline = this.redis.pipeline();
    for (const id of new Set(userIds)) pipeline.publish(channel(id), payload);
    await pipeline.exec();
  }
}

type Listener = (event: string) => void;

/**
 * Fan-in of Redis pub/sub for this API instance. Subscribes to a user's channel
 * only while that user has an open stream here (reference counted), so each
 * instance receives only the traffic it serves — scales horizontally.
 */
@Injectable()
export class RealtimeHub implements OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeHub.name);
  private readonly subscriber: Redis;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(@Inject(ENV) env: Env) {
    this.subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
    this.subscriber.on('message', (ch: string, message: string) => {
      for (const listener of this.listeners.get(ch) ?? []) listener(message);
    });
    this.subscriber.on('error', (err) => this.logger.warn({ err }, 'realtime subscriber error'));
  }

  async subscribe(userId: string, listener: Listener): Promise<() => Promise<void>> {
    if (this.subscriber.status === 'wait') await this.subscriber.connect();
    const ch = channel(userId);
    let set = this.listeners.get(ch);
    if (!set) {
      set = new Set();
      this.listeners.set(ch, set);
      await this.subscriber.subscribe(ch);
    }
    set.add(listener);
    return async () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(ch);
        await this.subscriber.unsubscribe(ch).catch(() => undefined);
      }
    };
  }

  get connections(): number {
    let n = 0;
    for (const set of this.listeners.values()) n += set.size;
    return n;
  }

  async onApplicationShutdown(): Promise<void> {
    this.subscriber.disconnect();
  }
}

@Global()
@Module({ providers: [RealtimePublisher, RealtimeHub], exports: [RealtimePublisher, RealtimeHub] })
export class RealtimeModule {}
