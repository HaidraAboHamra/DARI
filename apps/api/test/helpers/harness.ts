import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { createApp } from '../../src/bootstrap';
import { loadEnv } from '../../src/config/env';
import { DB, type Database } from '../../src/infrastructure/database/database.module';
import { runMigrations } from '../../src/infrastructure/database/migrate';
import { createDatabase, createPool } from '../../src/infrastructure/database/database.module';
import { seed, SEED_USERS } from '../../src/infrastructure/database/seed/seed';

export interface Harness {
  app: NestFastifyApplication;
  db: Database;
  close(): Promise<void>;
}

/** Fresh schema + seed + a booted HTTP app, per test file. */
export async function createHarness(): Promise<Harness> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL, 2);
  const admin = createDatabase(pool);
  await admin.execute(sql`drop schema if exists public cascade`);
  await admin.execute(sql`drop schema if exists drizzle cascade`);
  await admin.execute(sql`create schema public`);
  await pool.end();
  await runMigrations(env.DATABASE_URL);

  const redis = new Redis(env.REDIS_URL);
  await redis.flushdb();
  await redis.quit();

  const app = await createApp(env, { logger: false });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const db = app.get<Database>(DB);
  await seed(db);
  return { app, db, close: () => app.close() };
}

export type SeedUser = keyof typeof SEED_USERS;

export async function login(app: NestFastifyApplication, phone: string): Promise<string> {
  await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } });
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone, code: '123456' } });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.body}`);
  return res.json<{ accessToken: string }>().accessToken;
}

export function loginAs(app: NestFastifyApplication, user: SeedUser): Promise<string> {
  return login(app, SEED_USERS[user].phone);
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });
