import { Controller, Get, Inject, ServiceUnavailableException, VERSION_NEUTRAL } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { Public } from '../../common/auth/decorators';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { REDIS } from '../../infrastructure/redis/redis.module';

/** Liveness = process is up. Readiness = dependencies reachable (used by the load balancer). */
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const [db, redis] = await Promise.allSettled([this.db.execute(sql`select 1`), this.redis.ping()]);
    const checks = { database: db.status === 'fulfilled', redis: redis.status === 'fulfilled' };
    if (!checks.database || !checks.redis) throw new ServiceUnavailableException({ status: 'degraded', checks });
    return { status: 'ok', checks };
  }
}
