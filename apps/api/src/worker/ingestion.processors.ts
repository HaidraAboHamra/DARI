import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { type Job, Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { DB, type Database } from '../infrastructure/database/database.module';
import { analyticsEvents } from '../infrastructure/database/partitioned/analytics-events';
import { type AnalyticsJob, QUEUES, type SearchLogJob } from '../infrastructure/queue/queues';
import { searchDemandDaily, searchQueries } from '../infrastructure/database/schema';
import type { Intent, Vertical } from '@dari/contracts';

/** Consumers for the analytics and search-log queues. */
@Injectable()
export class IngestionProcessors implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(IngestionProcessors.name);
  private readonly workers: Worker[] = [];
  private readonly connection: Redis;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) env: Env,
  ) {
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  onApplicationBootstrap(): void {
    this.workers.push(
      new Worker<AnalyticsJob>(QUEUES.analytics, (job) => this.persistAnalytics(job), { connection: this.connection, concurrency: 4 }),
      new Worker<SearchLogJob>(QUEUES.searchLog, (job) => this.persistSearch(job.data), { connection: this.connection, concurrency: 8 }),
    );
    for (const w of this.workers) w.on('failed', (job, err) => this.logger.warn({ err, jobId: job?.id }, `${w.name} job failed`));
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.connection.quit().catch(() => this.connection.disconnect());
  }

  async persistAnalytics(job: Pick<Job<AnalyticsJob>, 'data'>): Promise<void> {
    const rows = job.data.events.map((e) => ({ ...e, occurredAt: new Date(e.occurredAt), receivedAt: new Date(e.receivedAt) }));
    if (!rows.length) return;
    await this.db.insert(analyticsEvents).values(rows).onConflictDoNothing();

    // Attribute result clicks back to the search that produced them (search → action funnel).
    const clicks = rows.filter((r) => r.name === 'search.result_clicked' && r.searchId && r.entityId);
    for (const c of clicks) {
      await this.db.execute(
        sql`update ${searchQueries} set clicked_entity_id = ${c.entityId} where id = ${c.searchId} and clicked_entity_id is null`,
      );
    }
  }

  /** Raw log + idempotent daily roll-up in one transaction (jobId = searchId dedupes retries). */
  async persistSearch(data: SearchLogJob): Promise<void> {
    const createdAt = new Date(data.createdAt);
    const isZero = data.resultsCount === 0;
    await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(searchQueries)
        .values({
          id: data.id,
          cityId: data.cityId,
          userId: data.userId,
          anonymousId: data.anonymousId,
          rawQuery: data.rawQuery,
          normalizedQuery: data.normalizedQuery,
          intent: data.intent as Intent,
          intentConfidence: data.intentConfidence,
          vertical: data.vertical as Vertical | null,
          resultsCount: data.resultsCount,
          isZeroResult: isZero,
          createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: searchQueries.id });
      if (!inserted.length || !data.normalizedQuery) return;

      await tx
        .insert(searchDemandDaily)
        .values({
          cityId: data.cityId,
          day: data.createdAt.slice(0, 10),
          normalizedQuery: data.normalizedQuery,
          vertical: data.vertical as Vertical | null,
          searches: 1,
          zeroResults: isZero ? 1 : 0,
          lastSearchedAt: createdAt,
        })
        .onConflictDoUpdate({
          target: [searchDemandDaily.cityId, searchDemandDaily.day, searchDemandDaily.normalizedQuery],
          set: {
            searches: sql`${searchDemandDaily.searches} + 1`,
            zeroResults: sql`${searchDemandDaily.zeroResults} + ${isZero ? 1 : 0}`,
            lastSearchedAt: sql`greatest(${searchDemandDaily.lastSearchedAt}, excluded.last_searched_at)`,
            vertical: sql`coalesce(excluded.vertical, ${searchDemandDaily.vertical})`,
          },
        });
    });
  }
}
