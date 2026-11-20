import { sql } from 'drizzle-orm';
import { doublePrecision, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { businesses } from './directory';
import { applicationStatusEnum, contentStatusEnum, employmentTypeEnum, jobStatusEnum } from './enums';
import { areas, cities } from './geo';
import { users } from './identity';

export const jobs = pgTable(
  'jobs',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    businessId: uuid().references(() => businesses.id, { onDelete: 'set null' }),
    postedById: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    description: text().notNull(),
    employmentType: employmentTypeEnum().notNull(),
    salaryMin: integer(),
    salaryMax: integer(),
    areaId: uuid().references(() => areas.id),
    contactPhone: text(),
    status: jobStatusEnum().notNull().default('open'),
    expiresAt: timestamp({ withTimezone: true }),
    searchText: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.status, t.id.desc()),
    index('jobs_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const jobApplications = pgTable(
  'job_applications',
  {
    id: pk(),
    jobId: uuid()
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    applicantId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text(),
    phone: text(),
    status: applicationStatusEnum().notNull().default('submitted'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.jobId, t.applicantId), index().on(t.applicantId)],
);

export const articles = pgTable(
  'articles',
  {
    id: pk(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    slug: text().notNull().unique(),
    title: text().notNull(),
    summary: text().notNull(),
    body: text().notNull(),
    category: text(),
    coverUrl: text(),
    /** Where the story happens (shown on the city map); optional. */
    lat: doublePrecision(),
    lng: doublePrecision(),
    status: contentStatusEnum().notNull().default('draft'),
    publishedAt: timestamp({ withTimezone: true }),
    searchText: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.cityId, t.status, t.publishedAt.desc(), t.id.desc()),
    index('articles_search_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);
