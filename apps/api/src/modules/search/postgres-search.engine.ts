import { Inject, Injectable } from '@nestjs/common';
import { isOpenAt, type SearchHit } from '@dari/contracts';
import { aliasedTable, and, asc, desc, eq, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { DB_READ, type Database } from '../../infrastructure/database/database.module';
import { areas, articles, businesses, categories, cityEvents, jobs, products, propertyListings, users } from '../../infrastructure/database/schema';
import { toListing } from '../property/property.service';
import { toEvent } from '../events/events.service';
import { cityConfig, cityTimezone, toSummary } from '../directory/businesses.repository';

import { toProduct } from '../catalog/catalog.service';
import { openJobConditions, toJob } from '../jobs/jobs.service';
import { toArticle } from '../news/news.service';
import { SearchEngine, type SearchRequest } from './search-engine';

const category = aliasedTable(categories, 'category');
const area = aliasedTable(areas, 'area');
/** Over-fetch factor when results are post-filtered in memory (open-now). */
const OPEN_NOW_OVERFETCH = 4;
const KIND_PRIORITY_BOOST = 0.25;

/** Trigram-based search over normalized Arabic text, served from the read replica. */
@Injectable()
export class PostgresSearchEngine extends SearchEngine {
  constructor(@Inject(DB_READ) private readonly db: Database) {
    super();
  }

  async search(request: SearchRequest): Promise<SearchHit[]> {
    const runs = request.kinds.map((kind) => {
      switch (kind) {
        case 'business':
          return this.businesses(request);
        case 'product':
          return request.terms.length ? this.products(request) : Promise.resolve([]);
        case 'job':
          return this.jobs(request);
        case 'article':
          return this.articles(request);
        case 'event':
          return this.events(request);
        case 'listing':
          return this.listings(request);
      }
    });
    // Kinds are ordered by relevance to the intent; earlier kinds get a ranking boost.
    const hits = (await Promise.all(runs)).flatMap((kindHits, index) =>
      kindHits.map((hit) => ({ ...hit, score: hit.score + (request.kinds.length - index - 1) * KIND_PRIORITY_BOOST })),
    );
    return hits.sort((a, b) => b.score - a.score).slice(0, request.limit * 2);
  }

  private async businesses(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(businesses.searchText, req.terms);
    const conditions: SQL[] = [eq(businesses.cityId, req.cityId), eq(businesses.status, 'active')];
    if (text) conditions.push(text.where);
    if (req.vertical) conditions.push(eq(businesses.vertical, req.vertical));
    if (req.categoryIds.length) conditions.push(inArray(businesses.categoryId, req.categoryIds));

    const rows = await this.db
      .select({ business: businesses, categoryName: category.nameAr, areaName: area.nameAr, cityConfig, cityTimezone, score: text?.score ?? sql<number>`0.5` })
      .from(businesses)
      .leftJoin(category, eq(category.id, businesses.categoryId))
      .leftJoin(area, eq(area.id, businesses.areaId))
      .where(and(...conditions))
      .orderBy(...rankBy(text, desc(businesses.ratingAvg), desc(businesses.id)))
      .limit(req.openNow ? req.limit * OPEN_NOW_OVERFETCH : req.limit);

    const now = new Date();
    return rows
      .filter((r) => !req.openNow || isOpenAt(r.business.openingHours, now, req.timezone))
      .slice(0, req.limit)
      .map((r) => ({
        kind: 'business' as const,
        score: Number(r.score) + r.business.ratingAvg * 0.03 + (r.business.verifiedAt ? 0.02 : 0) + (r.business.featuredUntil && r.business.featuredUntil > now ? 0.15 : 0),
        item: toSummary(r),
      }));
  }

  private async products(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(products.searchText, req.terms)!;
    const conditions: SQL[] = [
      eq(businesses.cityId, req.cityId),
      eq(businesses.status, 'active'),
      isNull(products.deletedAt),
      eq(products.isAvailable, true),
      text.where,
    ];
    if (req.vertical) conditions.push(eq(businesses.vertical, req.vertical));

    const rows = await this.db
      .select({ product: products, businessSlug: businesses.slug, businessName: businesses.name, score: text.score })
      .from(products)
      .innerJoin(businesses, eq(businesses.id, products.businessId))
      .where(and(...conditions))
      .orderBy(desc(text.score), products.price)
      .limit(req.limit);
    return rows.map((r) => ({
      kind: 'product' as const,
      score: Number(r.score) * 0.95,
      item: { ...toProduct(r.product), businessSlug: r.businessSlug, businessName: r.businessName },
    }));
  }

  private async jobs(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(jobs.searchText, req.terms);
    const conditions: SQL[] = [eq(jobs.cityId, req.cityId), ...openJobConditions()];
    if (text) conditions.push(text.where);
    const rows = await this.db
      .select({ job: jobs, businessName: businesses.name, areaName: area.nameAr, score: text?.score ?? sql<number>`0.5` })
      .from(jobs)
      .leftJoin(businesses, eq(businesses.id, jobs.businessId))
      .leftJoin(area, eq(area.id, jobs.areaId))
      .where(and(...conditions))
      .orderBy(...rankBy(text, desc(jobs.id)))
      .limit(req.limit);
    return rows.map((r) => ({ kind: 'job' as const, score: Number(r.score), item: toJob(r) }));
  }

  private async events(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(cityEvents.searchText, req.terms);
    const conditions: SQL[] = [eq(cityEvents.cityId, req.cityId), eq(cityEvents.status, 'published'), sql`${cityEvents.startsAt} > now()`];
    if (text) conditions.push(text.where);
    if (req.vertical === 'trips') conditions.push(eq(cityEvents.kind, 'trip'));
    if (req.vertical === 'events') conditions.push(eq(cityEvents.kind, 'event'));
    const rows = await this.db
      .select({ event: cityEvents, organizerName: sql<string | null>`coalesce(${businesses.name}, ${users.name})`, score: text?.score ?? sql<number>`0.5` })
      .from(cityEvents)
      .leftJoin(businesses, eq(businesses.id, cityEvents.businessId))
      .innerJoin(users, eq(users.id, cityEvents.organizerId))
      .where(and(...conditions))
      .orderBy(...rankBy(text, asc(cityEvents.startsAt)))
      .limit(req.limit);
    return rows.map((r) => ({ kind: 'event' as const, score: Number(r.score), item: toEvent(r) }));
  }

  private async listings(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(propertyListings.searchText, req.terms);
    const conditions: SQL[] = [eq(propertyListings.cityId, req.cityId), eq(propertyListings.status, 'active')];
    if (text) conditions.push(text.where);
    if (req.property?.purpose) conditions.push(eq(propertyListings.purpose, req.property.purpose));
    if (req.property?.propertyType) conditions.push(eq(propertyListings.propertyType, req.property.propertyType));
    const rows = await this.db
      .select({ listing: propertyListings, areaName: area.nameAr, officeName: businesses.name, score: text?.score ?? sql<number>`0.5` })
      .from(propertyListings)
      .leftJoin(area, eq(area.id, propertyListings.areaId))
      .leftJoin(businesses, eq(businesses.id, propertyListings.businessId))
      .where(and(...conditions))
      .orderBy(...rankBy(text, desc(propertyListings.id)))
      .limit(req.limit);
    return rows.map((r) => ({ kind: 'listing' as const, score: Number(r.score), item: toListing(r) }));
  }

  private async articles(req: SearchRequest): Promise<SearchHit[]> {
    const text = textMatch(articles.searchText, req.terms);
    const conditions: SQL[] = [eq(articles.cityId, req.cityId), eq(articles.status, 'published')];
    if (text) conditions.push(text.where);
    const rows = await this.db
      .select({ article: articles, score: text?.score ?? sql<number>`0.45` })
      .from(articles)
      .where(and(...conditions))
      .orderBy(...rankBy(text, desc(articles.id)))
      .limit(req.limit);
    return rows.map((r) => ({ kind: 'article' as const, score: Number(r.score) * 0.9, item: toArticle(r.article) }));
  }
}

/**
 * Fuzzy match: word-similarity (`<%`, typo tolerant) OR every term as a
 * substring. Both forms are served by the GIN trigram index.
 */
function textMatch(column: AnyPgColumn, terms: string[]): { where: SQL; score: SQL<number> } | null {
  if (!terms.length) return null;
  const query = terms.join(' ');
  const substrings = terms.map((t) => like(column, `%${escapeLike(t)}%`));
  return {
    where: or(sql`${query} <% ${column}`, and(...substrings))!,
    score: sql<number>`word_similarity(${query}, ${column})`,
  };
}

/** Relevance first when there is a text query, then the given tie-breakers. */
function rankBy(text: { score: SQL<number> } | null, ...tieBreakers: SQL[]): SQL[] {
  return text ? [desc(text.score), ...tieBreakers] : tieBreakers;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
