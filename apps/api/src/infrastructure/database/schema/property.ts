import { sql } from 'drizzle-orm';
import { doublePrecision, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { leadStatusEnum, listingPurposeEnum, listingStatusEnum, propertyTypeEnum } from './enums';
import { areas, cities } from './geo';
import { users } from './identity';

/** Real-estate listings (blueprint §12.2): sale/rent, houses, land, shops, farms. */
export const propertyListings = pgTable(
  'property_listings',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    businessId: uuid().references(() => businesses.id, { onDelete: 'set null' }),
    purpose: listingPurposeEnum().notNull(),
    propertyType: propertyTypeEnum().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    price: integer().notNull(),
    areaId: uuid().references(() => areas.id),
    rooms: integer(),
    sizeSqm: integer(),
    address: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    images: text().array().notNull().default(sql`'{}'::text[]`),
    status: listingStatusEnum().notNull().default('active'),
    featuredUntil: timestamp({ withTimezone: true }),
    searchText: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.status, t.purpose, t.propertyType, t.id.desc()),
    index().on(t.ownerId),
    index('listings_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

/** A viewing request is a lead for the owner/office (Lead CRM). */
export const viewingRequests = pgTable(
  'viewing_requests',
  {
    id: pk(),
    listingId: uuid()
      .notNull()
      .references(() => propertyListings.id, { onDelete: 'cascade' }),
    requesterId: uuid()
      .notNull()
      .references(() => users.id),
    phone: text().notNull(),
    message: text(),
    preferredTime: text(),
    status: leadStatusEnum().notNull().default('new'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.listingId, t.id.desc()), index().on(t.requesterId)],
);
