import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { type JobsOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { type AnalyticsJob, QUEUES, type SearchLogJob } from './queues';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: true,
  removeOnFail: 5_000,
};

/**
 * Producer side of the background pipeline. Request handlers enqueue and return
 * immediately; the worker process persists in batches. Keeps p99 latency flat
 * under analytics/search spikes.
 */
@Injectable()
export class JobQueue implements OnApplicationShutdown {
  private readonly connection: Redis;
  private readonly analytics: Queue<AnalyticsJob>;
  private readonly searchLog: Queue<SearchLogJob>;

  constructor(@Inject(ENV) env: Env) {
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.analytics = new Queue(QUEUES.analytics, { connection: this.connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    this.searchLog = new Queue(QUEUES.searchLog, { connection: this.connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
  }

  async enqueueAnalytics(job: AnalyticsJob): Promise<void> {
    await this.analytics.add('batch', job);
  }

  async enqueueSearchLog(job: SearchLogJob): Promise<void> {
    await this.searchLog.add('search', job, { jobId: job.id });
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.analytics.close(), this.searchLog.close()]);
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}

@Global()
@Module({ providers: [JobQueue], exports: [JobQueue] })
export class QueueModule {}
