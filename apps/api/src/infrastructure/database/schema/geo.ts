import type { DeliveryPricing } from '@dari/contracts';
import { sql } from 'drizzle-orm';
import { boolean, doublePrecision, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { verticalEnum } from './enums';

export interface CityConfig {
  /** Default delivery fee for the city when a business does not override it. */
  deliveryBaseFee: number;
  /** Ordering is enabled per vertical so a city can launch layer by layer. */
  orderingVerticals: string[];
  /** Distance-based delivery pricing set by admins; absent = derived from deliveryBaseFee. */
  deliveryPricing?: DeliveryPricing;
}

/** City is a dimension, not a hard-coded product (blueprint §13.1). */
export const cities = pgTable('cities', {
  id: pk(),
  slug: text().notNull().unique(),
  nameAr: text().notNull(),
  nameEn: text().notNull(),
  countryCode: text().notNull().default('SY'),
  currency: text().notNull().default('SYP'),
  timezone: text().notNull().default('Asia/Damascus'),
  isActive: boolean().notNull().default(true),
  config: jsonb().$type<CityConfig>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const areas = pgTable(
  'areas',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    slug: text().notNull(),
    nameAr: text().notNull(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.cityId, t.slug)],
);

export const categories = pgTable(
  'categories',
  {
    id: pk(),
    vertical: verticalEnum().notNull(),
    parentId: uuid(),
    slug: text().notNull().unique(),
    nameAr: text().notNull(),
    nameEn: text(),
    /** Normalized Arabic keywords and dialect synonyms used by the intent engine. */
    keywords: text().array().notNull().default(sql`'{}'::text[]`),
    sortOrder: doublePrecision().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.vertical, t.sortOrder)],
);
