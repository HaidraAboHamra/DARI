import { sql } from 'drizzle-orm';
import { doublePrecision, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { contentStatusEnum, eventKindEnum, ticketStatusEnum } from './enums';
import { cities } from './geo';
import { users } from './identity';

/** Events and trips with limited seats (blueprint §5.9, §10). */
export const cityEvents = pgTable(
  'events',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    organizerId: uuid()
      .notNull()
      .references(() => users.id),
    businessId: uuid().references(() => businesses.id, { onDelete: 'set null' }),
    kind: eventKindEnum().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    venue: text().notNull(),
    destination: text(),
    /** Venue position on the city map; optional. */
    lat: doublePrecision(),
    lng: doublePrecision(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    capacity: integer().notNull(),
    /** Denormalized counter, updated with a conditional UPDATE so seats never oversell. */
    seatsTaken: integer().notNull().default(0),
    price: integer().notNull().default(0),
    coverUrl: text(),
    status: contentStatusEnum().notNull().default('published'),
    searchText: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.status, t.startsAt),
    index('events_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const tickets = pgTable(
  'tickets',
  {
    id: pk(),
    eventId: uuid()
      .notNull()
      .references(() => cityEvents.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    /** Short code printed in the QR; scanned at the door. */
    code: text().notNull().unique(),
    quantity: integer().notNull(),
    total: integer().notNull(),
    status: ticketStatusEnum().notNull().default('active'),
    checkedInAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.id.desc()), index().on(t.eventId)],
);
