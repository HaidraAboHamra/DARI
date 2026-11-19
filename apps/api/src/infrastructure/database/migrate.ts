import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnv } from '../../config/env';
import { createDatabase, createPool } from './database.module';

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl, 1);
  try {
    await migrate(createDatabase(pool), { migrationsFolder: path.resolve(__dirname, '../../../drizzle') });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const env = loadEnv();
  runMigrations(env.DATABASE_URL)
    .then(() => console.log('✓ migrations applied'))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
