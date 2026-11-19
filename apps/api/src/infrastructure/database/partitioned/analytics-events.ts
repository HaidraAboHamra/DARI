import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * High-volume product analytics (blueprint §13.2).
 *
 * Declared outside the drizzle-kit schema on purpose: the table is
 * RANGE-partitioned by month in a hand-written migration (drizzle-kit cannot
 * express partitioning). Old partitions can be detached/archived in O(1).
 */
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid().notNull(),
  name: text().notNull(),
  cityId: uuid(),
  userId: uuid(),
  anonymousId: text(),
  entityType: text(),
  entityId: uuid(),
  searchId: uuid(),
  props: jsonb().$type<Record<string, string | number | boolean>>(),
  occurredAt: timestamp({ withTimezone: true }).notNull(),
  receivedAt: timestamp({ withTimezone: true }).notNull(),
});
