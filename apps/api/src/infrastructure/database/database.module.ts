import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { dbPool } from '../../modules/metrics/metrics';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run a query: the pool or an open transaction. */
export type DbExecutor = Database | Transaction;

/** Primary (read/write) database. */
export const DB = Symbol('DB');
/**
 * Read-only database for heavy reads (search, listings, insights).
 * Points to a streaming replica when DATABASE_REPLICA_URL is set,
 * so read traffic scales horizontally without touching the primary.
 */
export const DB_READ = Symbol('DB_READ');

export function createPool(url: string, max: number): Pool {
  return new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: 'dari-api',
    // Typo tolerance for Arabic search (default 0.6 is too strict for short words).
    options: '-c pg_trgm.word_similarity_threshold=0.45',
  });
}

export function createDatabase(pool: Pool): Database {
  return drizzle(pool, { schema, casing: 'snake_case' });
}

@Injectable()
class PoolRegistry implements OnApplicationShutdown {
  readonly primary: Pool;
  readonly replica: Pool | null;

  constructor(@Inject(ENV) env: Env) {
    this.primary = createPool(env.DATABASE_URL, env.DB_POOL_MAX);
    this.replica = env.DATABASE_REPLICA_URL ? createPool(env.DATABASE_REPLICA_URL, env.DB_POOL_MAX) : null;
    const timer = setInterval(() => {
      for (const [name, pool] of [['primary', this.primary], ['replica', this.replica]] as const) {
        if (!pool) continue;
        dbPool.set({ pool: name, state: 'total' }, pool.totalCount);
        dbPool.set({ pool: name, state: 'idle' }, pool.idleCount);
        dbPool.set({ pool: name, state: 'waiting' }, pool.waitingCount);
      }
    }, 5_000);
    timer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.primary.end(), this.replica?.end()]);
  }
}

@Global()
@Module({
  providers: [
    PoolRegistry,
    { provide: DB, inject: [PoolRegistry], useFactory: (p: PoolRegistry) => createDatabase(p.primary) },
    {
      provide: DB_READ,
      inject: [PoolRegistry],
      useFactory: (p: PoolRegistry) => createDatabase(p.replica ?? p.primary),
    },
  ],
  exports: [DB, DB_READ],
})
export class DatabaseModule {}
