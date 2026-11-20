import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { OpeningHours } from '@dari/contracts';
import { createdAt, pk, updatedAt } from './_shared';
import { businessRoleEnum, businessStatusEnum, planEnum, verticalEnum } from './enums';
import { areas, categories, cities } from './geo';
import { users } from './identity';

export const businesses = pgTable(
  'businesses',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    slug: text().notNull().unique(),
    name: text().notNull(),
    vertical: verticalEnum().notNull(),
    categoryId: uuid().references(() => categories.id),
    areaId: uuid().references(() => areas.id),
    description: text(),
    phone: text(),
    whatsapp: text(),
    address: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    openingHours: jsonb().$type<OpeningHours>().notNull().default([]),
    logoUrl: text(),
    coverUrl: text(),
    status: businessStatusEnum().notNull().default('pending_review'),
    acceptsOrders: boolean().notNull().default(false),
    /** Overrides the city delivery fee when set. */
    deliveryFee: integer(),
    prepMinutes: integer().notNull().default(20),
    minOrder: integer().notNull().default(0),
    verifiedAt: timestamp({ withTimezone: true }),
    plan: planEnum().notNull().default('free'),
    planExpiresAt: timestamp({ withTimezone: true }),
    /** Paid "featured" placement (blueprint §17): ranking boost + badge until this time. */
    featuredUntil: timestamp({ withTimezone: true }),
    ratingAvg: real().notNull().default(0),
    ratingCount: integer().notNull().default(0),
    /** Normalized name + category + description, indexed with pg_trgm. */
    searchText: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('businesses_listing_idx').on(t.cityId, t.status, t.vertical, t.ratingAvg.desc(), t.id.desc()),
    index().on(t.categoryId),
    index('businesses_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const businessMembers = pgTable(
  'business_members',
  {
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: businessRoleEnum().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.userId] }), index().on(t.userId)],
);

/** Customer Connect: consented merchant ↔ citizen relationship (blueprint §8). */
export const customerRelationships = pgTable(
  'customer_relationships',
  {
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: text().notNull(),
    ordersCount: integer().notNull().default(0),
    totalSpent: integer().notNull().default(0),
    lastOrderAt: timestamp({ withTimezone: true }),
    consentedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.userId] }), index().on(t.businessId, t.lastOrderAt)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer().notNull(),
    quality: integer(),
    commitment: integer(),
    interaction: integer(),
    body: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.businessId, t.id.desc()), uniqueIndex('reviews_one_per_user').on(t.businessId, t.userId)],
);
