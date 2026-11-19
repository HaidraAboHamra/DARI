import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { quoteStatusEnum, serviceRequestStatusEnum, serviceUrgencyEnum } from './enums';
import { areas, categories, cities } from './geo';
import { users } from './identity';

/** Provider OS (blueprint §9): a citizen's need for a professional service. */
export const serviceRequests = pgTable(
  'service_requests',
  {
    id: pk(),
    number: text().notNull().unique(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    customerId: uuid()
      .notNull()
      .references(() => users.id),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id),
    targetBusinessId: uuid().references(() => businesses.id),
    providerBusinessId: uuid().references(() => businesses.id),
    areaId: uuid().references(() => areas.id),
    description: text().notNull(),
    address: text().notNull(),
    urgency: serviceUrgencyEnum().notNull(),
    preferredAt: timestamp({ withTimezone: true }),
    status: serviceRequestStatusEnum().notNull().default('open'),
    finalPrice: integer(),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.categoryId, t.status, t.id.desc()),
    index().on(t.customerId, t.id.desc()),
    index().on(t.providerBusinessId, t.status),
    index().on(t.targetBusinessId, t.status),
  ],
);

export const serviceQuotes = pgTable(
  'service_quotes',
  {
    id: pk(),
    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    createdById: uuid()
      .notNull()
      .references(() => users.id),
    priceMin: integer().notNull(),
    priceMax: integer().notNull(),
    etaMinutes: integer().notNull(),
    message: text(),
    status: quoteStatusEnum().notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.requestId, t.businessId)],
);
