import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk } from './_shared';
import { businesses } from './directory';
import { couponKindEnum, favoriteTypeEnum, paymentMethodEnum, planEnum } from './enums';
import { users } from './identity';

export const coupons = pgTable(
  'coupons',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    code: text().notNull(),
    title: text().notNull(),
    kind: couponKindEnum().notNull(),
    value: integer().notNull(),
    minOrder: integer().notNull().default(0),
    maxDiscount: integer(),
    maxUses: integer(),
    usedCount: integer().notNull().default(0),
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    isPublic: boolean().notNull().default(true),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.businessId, t.code)],
);

/** Audience messaging to consented customers — no contact data leaves the platform (blueprint §8.5). */
export const broadcasts = pgTable(
  'broadcasts',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    createdById: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    body: text().notNull(),
    audienceCount: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.businessId, t.id.desc())],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: favoriteTypeEnum().notNull(),
    entityId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.entityType, t.entityId] }), index().on(t.userId, t.createdAt)],
);

/** Manually recorded subscription payments (revenue-first: manual billing before payment automation). */
export const planPayments = pgTable(
  'plan_payments',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    plan: planEnum().notNull(),
    months: integer().notNull(),
    amount: integer().notNull(),
    method: paymentMethodEnum().notNull(),
    reference: text(),
    recordedById: uuid()
      .notNull()
      .references(() => users.id),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.businessId, t.id.desc())],
);

export const media = pgTable(
  'media',
  {
    id: pk(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    key: text().notNull().unique(),
    contentType: text().notNull(),
    size: integer().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.ownerId)],
);
