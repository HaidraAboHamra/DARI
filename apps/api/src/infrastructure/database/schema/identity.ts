import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { platformRoleEnum } from './enums';
import { cities } from './geo';

export const users = pgTable('users', {
  id: pk(),
  phone: text().notNull().unique(),
  name: text(),
  role: platformRoleEnum().notNull().default('citizen'),
  cityId: uuid().references(() => cities.id),
  phoneVerifiedAt: timestamp({ withTimezone: true }),
  lastSeenAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * One row per signed-in device. The refresh token is rotated on every use;
 * the previous hash is kept to detect replay of a stolen token.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text().notNull().unique(),
    previousTokenHash: text(),
    deviceName: text(),
    ip: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.previousTokenHash)],
);
