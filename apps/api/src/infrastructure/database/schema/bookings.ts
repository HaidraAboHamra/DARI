import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { OpeningHours } from '@dari/contracts';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { bookingStatusEnum, bookingUnitEnum, resourceKindEnum } from './enums';
import { cities } from './geo';
import { users } from './identity';

/**
 * Anything bookable: a doctor's appointments, a football court, a hotel room
 * type, a farm/chalet, a salon chair (one generic engine — blueprint §26).
 */
export const bookableResources = pgTable(
  'bookable_resources',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    kind: resourceKindEnum().notNull(),
    unit: bookingUnitEnum().notNull(),
    slotMinutes: integer().notNull().default(60),
    /** Simultaneous bookings allowed (rooms of this type, chairs, …). */
    capacity: integer().notNull().default(1),
    price: integer().notNull().default(0),
    weeklyHours: jsonb().$type<OpeningHours>().notNull().default([]),
    autoConfirm: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.businessId)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: pk(),
    number: text().notNull().unique(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    resourceId: uuid()
      .notNull()
      .references(() => bookableResources.id),
    customerId: uuid()
      .notNull()
      .references(() => users.id),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    partySize: integer().notNull().default(1),
    status: bookingStatusEnum().notNull().default('pending'),
    total: integer().notNull(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.resourceId, t.startsAt),
    index().on(t.businessId, t.startsAt),
    index().on(t.customerId, t.id.desc()),
  ],
);
