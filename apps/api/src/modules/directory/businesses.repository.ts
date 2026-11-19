import { Inject, Injectable } from '@nestjs/common';
import type { BusinessDetail, BusinessStatus, BusinessSummary, MapPoint, Membership, Page, Vertical } from '@dari/contracts';
import { aliasedTable, and, desc, eq, inArray, isNotNull, lt, or, type SQL, sql } from 'drizzle-orm';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB_READ, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, businessMembers, categories } from '../../infrastructure/database/schema';

const category = aliasedTable(categories, 'category');
const area = aliasedTable(areas, 'area');

const summaryColumns = {
  business: businesses,
  categoryName: category.nameAr,
  areaName: area.nameAr,
};

type SummaryRow = {
  business: typeof businesses.$inferSelect;
  categoryName: string | null;
  areaName: string | null;
};

export interface ListFilter {
  cityId: string;
  vertical?: Vertical | undefined;
  categoryId?: string | undefined;
  areaId?: string | undefined;
  cursor?: string | undefined;
  limit: number;
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

    return toPage(rows, filter.limit, toSummary, (r) => [r.featured, r.business.ratingAvg, r.business.id]);
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

export function toSummary(row: SummaryRow): BusinessSummary {
  const b = row.business;
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
    deliveryFee: b.deliveryFee,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}
