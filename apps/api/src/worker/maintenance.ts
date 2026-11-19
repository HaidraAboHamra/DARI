import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '../infrastructure/database/database.module';

const HOUR_MS = 3_600_000;
const OUTBOX_RETENTION_DAYS = 7;

/** Periodic housekeeping: future analytics partitions, outbox and session cleanup. */
@Injectable()
export class Maintenance implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(Maintenance.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  onApplicationBootstrap(): void {
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), HOUR_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<void> {
    try {
      await this.db.execute(sql`select ensure_analytics_partition(now()::date)`);
      await this.db.execute(sql`select ensure_analytics_partition((now() + interval '1 month')::date)`);
      await this.db.execute(sql`
        delete from outbox_events
        where processed_at < now() - make_interval(days => ${OUTBOX_RETENTION_DAYS})`);
      await this.db.execute(sql`delete from sessions where expires_at < now() - interval '7 days'`);
    } catch (err) {
      this.logger.error({ err }, 'maintenance run failed');
    }
  }
}
