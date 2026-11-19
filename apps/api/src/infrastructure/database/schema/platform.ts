import { isNull } from 'drizzle-orm';
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk } from './_shared';
import { intentEnum, verticalEnum } from './enums';
import { cities } from './geo';
import { users } from './identity';

/**
 * Transactional outbox: domain events are written in the same transaction as the
 * state change, then relayed by the worker. Guarantees no lost or phantom events.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: pk(),
    type: text().notNull(),
    aggregateType: text().notNull(),
    aggregateId: uuid().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    attempts: integer().notNull().default(0),
    lastError: text(),
    availableAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('outbox_pending_idx').on(t.availableAt).where(isNull(t.processedAt))],
);

export const notifications = pgTable(
  'notifications',
  {
    id: pk(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.id.desc())],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    actorId: uuid(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid().notNull(),
    businessId: uuid(),
    changes: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.entityType, t.entityId), index().on(t.businessId, t.id.desc())],
);

/** Raw search log (blueprint §4.2). Written asynchronously by the worker. */
export const searchQueries = pgTable(
  'search_queries',
  {
    id: uuid().primaryKey(),
    cityId: uuid().notNull(),
    userId: uuid(),
    anonymousId: text(),
    rawQuery: text().notNull(),
    normalizedQuery: text().notNull(),
    intent: intentEnum().notNull(),
    intentConfidence: real().notNull(),
    vertical: verticalEnum(),
    resultsCount: integer().notNull(),
    isZeroResult: boolean().notNull(),
    clickedEntityId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index().on(t.cityId, t.createdAt)],
);

/** Daily demand roll-up that powers City Intelligence without scanning raw logs. */
export const searchDemandDaily = pgTable(
  'search_demand_daily',
  {
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    day: date().notNull(),
    normalizedQuery: text().notNull(),
    vertical: verticalEnum(),
    searches: integer().notNull().default(0),
    zeroResults: integer().notNull().default(0),
    lastSearchedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.cityId, t.day, t.normalizedQuery] }),
    index().on(t.cityId, t.day, t.zeroResults),
  ],
);
