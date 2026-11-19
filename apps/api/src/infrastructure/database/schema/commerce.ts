import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { Place } from '@dari/contracts';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { deliveryStatusEnum, deliveryTypeEnum, fulfillmentEnum, orderStatusEnum } from './enums';
import { cities } from './geo';
import { users } from './identity';

export const products = pgTable(
  'products',
  {
    id: pk(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    section: text(),
    price: integer().notNull(),
    imageUrl: text(),
    isAvailable: boolean().notNull().default(true),
    /** NULL = stock not tracked. Decremented atomically on order placement. */
    stock: integer(),
    sortOrder: integer().notNull().default(0),
    searchText: text().notNull().default(''),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.businessId, t.sortOrder),
    index('products_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: pk(),
    number: text().notNull().unique(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id),
    customerId: uuid()
      .notNull()
      .references(() => users.id),
    status: orderStatusEnum().notNull().default('pending'),
    fulfillment: fulfillmentEnum().notNull(),
    subtotal: integer().notNull(),
    deliveryFee: integer().notNull().default(0),
    total: integer().notNull(),
    currency: text().notNull(),
    address: jsonb().$type<Place>(),
    notes: text(),
    idempotencyKey: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.customerId, t.id.desc()),
    index().on(t.businessId, t.status, t.id.desc()),
    index().on(t.cityId, t.createdAt),
    uniqueIndex('orders_idempotency_idx').on(t.customerId, t.idempotencyKey),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: pk(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    /** Snapshots: an order must not change when the catalog changes. */
    name: text().notNull(),
    unitPrice: integer().notNull(),
    quantity: integer().notNull(),
  },
  (t) => [index().on(t.orderId)],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: pk(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatusEnum(),
    toStatus: orderStatusEnum().notNull(),
    actorId: uuid(),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.orderId)],
);

/** Generic delivery engine task (blueprint §6.1) — not tied to food. */
export const deliveryTasks = pgTable(
  'delivery_tasks',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    type: deliveryTypeEnum().notNull(),
    status: deliveryStatusEnum().notNull().default('requested'),
    orderId: uuid().references(() => orders.id),
    requesterId: uuid()
      .notNull()
      .references(() => users.id),
    courierId: uuid().references(() => users.id),
    pickup: jsonb().$type<Place>().notNull(),
    dropoff: jsonb().$type<Place>().notNull(),
    itemDescription: text(),
    notes: text(),
    fee: integer().notNull().default(0),
    scheduledFor: timestamp({ withTimezone: true }),
    assignedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.status, t.id),
    index().on(t.requesterId, t.id.desc()),
    index().on(t.courierId, t.status),
    uniqueIndex().on(t.orderId),
  ],
);
