import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '../infrastructure/database/database.module';
import type { DomainEvent } from '../modules/platform/domain-events';
import { OutboxHandlers } from './outbox-handlers';

const BATCH_SIZE = 100;
const IDLE_DELAY_MS = 1_000;
const MAX_ATTEMPTS = 10;

interface OutboxRow {
  id: string;
  type: DomainEvent['type'];
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Polls the outbox with `FOR UPDATE SKIP LOCKED`, so any number of worker
 * replicas can run concurrently without processing an event twice at once.
 * Failures back off exponentially; poison events stop after MAX_ATTEMPTS.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);
  private running = false;
  private loop: Promise<void> | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly handlers: OutboxHandlers,
  ) {}

  onApplicationBootstrap(): void {
    this.running = true;
    this.loop = this.run();
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    await this.loop;
  }

  /** Processes one batch; returns how many events were handled. Exposed for tests. */
  async drainOnce(): Promise<number> {
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.execute<OutboxRow & Record<string, unknown>>(sql`
        select id, type, aggregate_id, payload, attempts from outbox_events
        where processed_at is null and available_at <= now() and attempts < ${MAX_ATTEMPTS}
        order by available_at
        limit ${BATCH_SIZE}
        for update skip locked`);

      for (const row of rows) {
        try {
          await this.handlers.handle({ type: row.type, aggregateId: row.aggregate_id, payload: row.payload } as DomainEvent);
          await tx.execute(sql`update outbox_events set processed_at = now() where id = ${row.id}`);
        } catch (err) {
          const delaySeconds = 2 ** Math.min(row.attempts, 10);
          this.logger.warn({ err, eventId: row.id, type: row.type }, 'outbox handler failed');
          await tx.execute(sql`
            update outbox_events
            set attempts = attempts + 1, last_error = ${String(err).slice(0, 1000)},
                available_at = now() + make_interval(secs => ${delaySeconds})
            where id = ${row.id}`);
        }
      }
      return rows.length;
    });
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        const processed = await this.drainOnce();
        if (processed < BATCH_SIZE) await sleep(IDLE_DELAY_MS);
      } catch (err) {
        this.logger.error({ err }, 'outbox relay iteration failed');
        await sleep(IDLE_DELAY_MS * 5);
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
