import { Controller, Get, Header, Inject, Req, UnauthorizedException, VERSION_NEUTRAL } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { Public } from '../../common/auth/decorators';
import { DB_READ, type Database } from '../../infrastructure/database/database.module';
import { RealtimeHub } from '../../infrastructure/realtime/realtime.module';
import { outboxBacklog, realtimeConnections, registry } from './metrics';

@Public()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB_READ) private readonly db: Database,
    private readonly hub: RealtimeHub,
  ) {}

  @Get()
  @Header('content-type', registry.contentType)
  async scrape(@Req() req: FastifyRequest): Promise<string> {
    if (this.env.METRICS_TOKEN && req.headers.authorization !== `Bearer ${this.env.METRICS_TOKEN}`) throw new UnauthorizedException();
    realtimeConnections.set(this.hub.connections);
    // Served by the partial index outbox_pending_idx: cheap even with a large table.
    const { rows } = await this.db.execute<{ n: number }>(sql`select count(*)::int as n from outbox_events where processed_at is null`);
    outboxBacklog.set(rows[0]?.n ?? 0);
    return registry.metrics();
  }
}
