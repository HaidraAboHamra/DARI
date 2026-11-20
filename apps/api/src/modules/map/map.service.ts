import { Inject, Injectable } from '@nestjs/common';
import { isOpenAt, type MapLayers } from '@dari/contracts';
import { aliasedTable, and, desc, eq, gte, isNotNull, or, sql } from 'drizzle-orm';
import { DB_READ, type Database } from '../../infrastructure/database/database.module';
import { areas, articles, businesses, categories, cityEvents, propertyListings } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { CitiesService } from '../cities/cities.service';

/** Short TTL: the map is «live» (open/closed, events now, fresh news) yet one query set serves every viewer. */
const TTL_SECONDS = 30;
const DAY = 86_400_000;
const category = aliasedTable(categories, 'category');

/** City map read model: every positioned thing in one cached response. */
@Injectable()
export class MapService {
  constructor(
    @Inject(DB_READ) private readonly db: Database,
    private readonly cities: CitiesService,
    private readonly cache: CacheService,
  ) {}

  async layers(citySlug: string): Promise<MapLayers> {
    const city = await this.cities.getBySlug(citySlug);
    return this.cache.getOrSet(`map:layers:${city.id}`, TTL_SECONDS, () => this.build(city.id, city.timezone));
  }

  private async build(cityId: string, timezone: string): Promise<MapLayers> {
    const now = new Date();
    const [areaRows, bizRows, eventRows, listingRows, newsRows] = await Promise.all([
      this.db.select({ lat: areas.lat, lng: areas.lng }).from(areas).where(and(eq(areas.cityId, cityId), isNotNull(areas.lat))),
      this.db
        .select({ b: businesses, categoryName: category.nameAr })
        .from(businesses)
        .leftJoin(category, eq(category.id, businesses.categoryId))
        .where(and(eq(businesses.cityId, cityId), eq(businesses.status, 'active'), isNotNull(businesses.lat), isNotNull(businesses.lng)))
        .orderBy(desc(businesses.ratingAvg))
        .limit(2000),
      this.db
        .select()
        .from(cityEvents)
        .where(
          and(
            eq(cityEvents.cityId, cityId),
            eq(cityEvents.status, 'published'),
            isNotNull(cityEvents.lat),
            // Not finished yet (or started within the last 6 hours when no end time is set).
            or(gte(cityEvents.endsAt, now), gte(cityEvents.startsAt, new Date(now.getTime() - 6 * 3_600_000))),
          ),
        )
        .orderBy(cityEvents.startsAt)
        .limit(200),
      this.db
        .select()
        .from(propertyListings)
        .where(and(eq(propertyListings.cityId, cityId), eq(propertyListings.status, 'active'), isNotNull(propertyListings.lat)))
        .orderBy(desc(propertyListings.id))
        .limit(500),
      this.db
        .select()
        .from(articles)
        .where(and(eq(articles.cityId, cityId), eq(articles.status, 'published'), isNotNull(articles.lat), gte(articles.publishedAt, new Date(now.getTime() - 30 * DAY))))
        .orderBy(desc(articles.publishedAt))
        .limit(100),
    ]);
    const center = areaRows.length
      ? { lat: areaRows.reduce((s, a) => s + a.lat!, 0) / areaRows.length, lng: areaRows.reduce((s, a) => s + a.lng!, 0) / areaRows.length }
      : { lat: 35.0113, lng: 37.0532 };

    return {
      center,
      businesses: bizRows.map(({ b, categoryName }) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        vertical: b.vertical,
        categoryName,
        lat: b.lat!,
        lng: b.lng!,
        isOpen: isOpenAt(b.openingHours, now, timezone),
        ratingAvg: Math.round(b.ratingAvg * 10) / 10,
        logoUrl: b.logoUrl,
      })),
      events: eventRows.map((e) => ({
        id: e.id,
        title: e.title,
        kind: e.kind,
        venue: e.venue,
        startsAt: e.startsAt.toISOString(),
        lat: e.lat!,
        lng: e.lng!,
        live: e.startsAt <= now && (e.endsAt ? e.endsAt >= now : now.getTime() - e.startsAt.getTime() < 3 * 3_600_000),
        price: e.price,
      })),
      listings: listingRows.map((l) => ({ id: l.id, title: l.title, purpose: l.purpose, propertyType: l.propertyType, price: l.price, lat: l.lat!, lng: l.lng! })),
      news: newsRows.map((a) => ({
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        category: a.category,
        publishedAt: a.publishedAt!.toISOString(),
        lat: a.lat!,
        lng: a.lng!,
        fresh: now.getTime() - a.publishedAt!.getTime() < DAY,
      })),
      generatedAt: now.toISOString(),
    };
  }
}
