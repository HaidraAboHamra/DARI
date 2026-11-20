import { Inject, Injectable } from '@nestjs/common';
import { type BusinessDetail, businessQuote, type BusinessStatus, type BusinessSummary, type GeoPoint, isOpenAt, type MapPoint, type Membership, type Page, type Vertical } from '@dari/contracts';
import { aliasedTable, and, desc, eq, inArray, isNotNull, lt, or, type SQL, sql } from 'drizzle-orm';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB_READ, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, businessMembers, categories, type CityConfig } from '../../infrastructure/database/schema';
import { cityPricing } from '../cities/cities.service';

const category = aliasedTable(categories, 'category');
const area = aliasedTable(areas, 'area');

/**
 * The city's config (delivery pricing), for businesses without their own fee. Explicitly
 * qualified: inside select fields Drizzle renders outer columns unqualified,
 * which a correlated subquery would silently bind to the wrong table.
 */
export const cityConfig = sql<CityConfig | null>`(select c.config from cities c where c.id = "businesses"."city_id")`;

export const cityTimezone = sql<string | null>`(select c.timezone from cities c where c.id = "businesses"."city_id")`;

export const summaryColumns = {
  business: businesses,
  categoryName: category.nameAr,
  areaName: area.nameAr,
  cityConfig,
  cityTimezone,
};

export type SummaryRow = {
  business: typeof businesses.$inferSelect;
  categoryName: string | null;
  areaName: string | null;
  cityConfig: CityConfig | null;
  cityTimezone: string | null;
};

export interface ListFilter {
  cityId: string;
  vertical?: Vertical | undefined;
  categoryId?: string | undefined;
  areaId?: string | undefined;
  cursor?: string | undefined;
  limit: number;
  /** Customer location for per-distance delivery fees. */
  from?: GeoPoint | undefined;
}

/** Read model for businesses: all joins and row → DTO mapping live here. */
@Injectable()
export class BusinessesRepository {
  constructor(@Inject(DB_READ) private readonly read: Database) {}

  private baseQuery(db: DbExecutor) {
    return db
      .select(summaryColumns)
      .from(businesses)
      .leftJoin(category, eq(category.id, businesses.categoryId))
      .leftJoin(area, eq(area.id, businesses.areaId));
  }

  async findById(id: string, db: DbExecutor = this.read): Promise<BusinessDetail | null> {
    const [row] = await this.baseQuery(db).where(eq(businesses.id, id)).limit(1);
    return row ? toDetail(row) : null;
  }

  async findBySlug(slug: string): Promise<BusinessDetail | null> {
    const [row] = await this.baseQuery(this.read).where(eq(businesses.slug, slug)).limit(1);
    return row ? toDetail(row) : null;
  }

  async findSummariesByIds(ids: string[]): Promise<Map<string, BusinessSummary>> {
    if (!ids.length) return new Map();
    const rows = await this.baseQuery(this.read).where(inArray(businesses.id, ids));
    return new Map(rows.map((r) => [r.business.id, toSummary(r)]));
  }

  /** Active businesses ordered by rating, keyset-paginated on (rating_avg, id). */
  async listActive(filter: ListFilter): Promise<Page<BusinessSummary>> {
    const conditions: SQL[] = [eq(businesses.cityId, filter.cityId), eq(businesses.status, 'active')];
    if (filter.vertical) conditions.push(eq(businesses.vertical, filter.vertical));
    if (filter.categoryId) conditions.push(eq(businesses.categoryId, filter.categoryId));
    if (filter.areaId) conditions.push(eq(businesses.areaId, filter.areaId));

    // Paid featured placement first (blueprint §17), then rating; keyset on (featured, rating, id).
    const featured = sql<number>`(case when ${businesses.featuredUntil} > now() then 1 else 0 end)`;
    const cursor = decodeCursor<[number, number, string]>(filter.cursor, 3);
    if (cursor) {
      const [f, rating, id] = cursor;
      conditions.push(
        or(
          lt(featured, f),
          and(sql`${featured} = ${f}`, lt(businesses.ratingAvg, rating)),
          and(sql`${featured} = ${f}`, eq(businesses.ratingAvg, rating), lt(businesses.id, id)),
        )!,
      );
    }

    const rows = await this.read
      .select({ ...summaryColumns, featured })
      .from(businesses)
      .leftJoin(category, eq(category.id, businesses.categoryId))
      .leftJoin(area, eq(area.id, businesses.areaId))
      .where(and(...conditions))
      .orderBy(desc(featured), desc(businesses.ratingAvg), desc(businesses.id))
      .limit(filter.limit + 1);

    return toPage(rows, filter.limit, (r) => toSummary(r, filter.from), (r) => [r.featured, r.business.ratingAvg, r.business.id]);
  }

  /** Lightweight points for the city map (no joins, capped). */
  async mapPoints(cityId: string, vertical: Vertical | undefined, limit: number): Promise<MapPoint[]> {
    const conditions: SQL[] = [eq(businesses.cityId, cityId), eq(businesses.status, 'active'), isNotNull(businesses.lat), isNotNull(businesses.lng)];
    if (vertical) conditions.push(eq(businesses.vertical, vertical));
    const rows = await this.read
      .select({ id: businesses.id, slug: businesses.slug, name: businesses.name, vertical: businesses.vertical, lat: businesses.lat, lng: businesses.lng })
      .from(businesses)
      .where(and(...conditions))
      .orderBy(desc(businesses.ratingAvg))
      .limit(limit);
    return rows.map((r) => ({ ...r, lat: r.lat!, lng: r.lng! }));
  }

  async listMemberships(userId: string): Promise<Membership[]> {
    const rows = await this.read
      .select({ ...summaryColumns, role: businessMembers.role })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
      .leftJoin(category, eq(category.id, businesses.categoryId))
      .leftJoin(area, eq(area.id, businesses.areaId))
      .where(eq(businessMembers.userId, userId))
      .orderBy(desc(businesses.id));
    return rows.map((r) => ({ business: { ...toSummary(r), status: r.business.status }, role: r.role }));
  }

  async listByStatus(status: BusinessStatus, limit: number): Promise<BusinessDetail[]> {
    const rows = await this.baseQuery(this.read)
      .where(eq(businesses.status, status))
      .orderBy(desc(businesses.id))
      .limit(limit);
    return rows.map(toDetail);
  }
}

export function toSummary(row: SummaryRow, customer?: GeoPoint): BusinessSummary {
  const b = row.business;
  const pricing = cityPricing(row.cityConfig ?? { deliveryBaseFee: 0, orderingVerticals: [] });
  const quote = businessQuote({ ownDeliveryFee: b.deliveryFee, location: b.lat !== null && b.lng !== null ? { lat: b.lat, lng: b.lng } : null }, pricing, customer);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    vertical: b.vertical,
    categoryName: row.categoryName,
    areaName: row.areaName,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
    ratingAvg: Math.round(b.ratingAvg * 10) / 10,
    ratingCount: b.ratingCount,
    isVerified: b.verifiedAt !== null,
    isFeatured: b.featuredUntil !== null && b.featuredUntil > new Date(),
    acceptsOrders: b.acceptsOrders,
    deliveryFee: quote.fee,
    distanceKm: quote.distanceKm,
    deliverable: quote.deliverable,
    prepMinutes: b.prepMinutes,
    minOrder: b.minOrder,
    isOpen: isOpenAt(b.openingHours, new Date(), row.cityTimezone ?? 'Asia/Damascus'),
  };
}

function toDetail(row: SummaryRow): BusinessDetail {
  const b = row.business;
  return {
    ...toSummary(row),
    cityId: b.cityId,
    categoryId: b.categoryId,
    description: b.description,
    phone: b.phone,
    whatsapp: b.whatsapp,
    address: b.address,
    location: b.lat !== null && b.lng !== null ? { lat: b.lat, lng: b.lng } : null,
    openingHours: b.openingHours,
    ownDeliveryFee: b.deliveryFee,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}
