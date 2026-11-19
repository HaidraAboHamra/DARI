import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

/**
 * Time-ordered UUIDv7 primary keys: globally unique (safe across shards/cities),
 * B-tree friendly (sequential inserts) and sortable, which lets us paginate
 * every list by `id` alone.
 */
export const pk = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const now = sql`now()`;
