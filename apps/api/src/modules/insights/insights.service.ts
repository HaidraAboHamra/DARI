import { Inject, Injectable } from '@nestjs/common';
import type { CityKpis, DemandInsight, Page, SmartInsight, Vertical } from '@dari/contracts';
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB_READ, type Database } from '../../infrastructure/database/database.module';
import {
  bookings,
  businesses,
  customerRelationships,
  deliveryTasks,
  jobApplications,
  jobs,
  orderItems,
  orders,
  products,
  searchDemandDaily,
  users,
} from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { segmentOf, type CustomerSegment } from './customer-segments';

const COMPLETED = ['delivered', 'picked_up'] as const;

export interface Opportunity {
  vertical: Vertical | null;
  searches: number;
  zeroResults: number;
  activeSupply: number;
  /** High search + low supply + low conversion (blueprint §14.3). Higher = bigger gap. */
  score: number;
}

/**
 * City Intelligence (blueprint §14) and merchant analytics. Reads only
 * aggregates and roll-ups, from the replica — never raw personal data.
 */
@Injectable()
export class InsightsService {
  constructor(
    @Inject(DB_READ) private readonly db: Database,
    private readonly cities: CitiesService,
    private readonly access: BusinessAccessService,
  ) {}

  async cityKpis(citySlug: string): Promise<CityKpis> {
    const city = await this.cities.getBySlug(citySlug);
    const since = daysAgo(7);
    const [[supply], [demand], [commerce], [applications], [deliveries]] = await Promise.all([
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(businesses)
        .where(and(eq(businesses.cityId, city.id), eq(businesses.status, 'active'))),
      this.db
        .select({
          searches: sql<number>`coalesce(sum(${searchDemandDaily.searches}), 0)::int`,
          zero: sql<number>`coalesce(sum(${searchDemandDaily.zeroResults}), 0)::int`,
        })
        .from(searchDemandDaily)
        .where(and(eq(searchDemandDaily.cityId, city.id), gte(searchDemandDaily.day, isoDay(since)))),
      this.db
        .select({
          orders: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${inArray(orders.status, [...COMPLETED])})::int`,
          gmv: sql<number>`coalesce(sum(${orders.total}) filter (where ${inArray(orders.status, [...COMPLETED])}), 0)::bigint`,
        })
        .from(orders)
        .where(and(eq(orders.cityId, city.id), gte(orders.createdAt, since))),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
        .where(and(eq(jobs.cityId, city.id), gte(jobApplications.createdAt, since))),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(deliveryTasks)
        .where(
          and(
            eq(deliveryTasks.cityId, city.id),
            eq(deliveryTasks.status, 'delivered'),
            sql`${deliveryTasks.orderId} is null`,
            gte(deliveryTasks.createdAt, since),
          ),
        ),
    ]);

    const searches = demand?.searches ?? 0;
    return {
      activeBusinesses: supply?.n ?? 0,
      searches7d: searches,
      zeroResultRate7d: searches ? Math.round(((demand?.zero ?? 0) / searches) * 1000) / 1000 : 0,
      orders7d: commerce?.orders ?? 0,
      // North-star metric: needs actually fulfilled (orders, applications, deliveries).
      completedNeeds7d: (commerce?.completed ?? 0) + (applications?.n ?? 0) + (deliveries?.n ?? 0),
      gmv7d: Number(commerce?.gmv ?? 0),
    };
  }

  async demand(citySlug: string, days: number, zeroOnly: boolean): Promise<DemandInsight[]> {
    const city = await this.cities.getBySlug(citySlug);
    const conditions: SQL[] = [eq(searchDemandDaily.cityId, city.id), gte(searchDemandDaily.day, isoDay(daysAgo(days)))];
    const zero = sql<number>`sum(${searchDemandDaily.zeroResults})::int`;
    const total = sql<number>`sum(${searchDemandDaily.searches})::int`;
    const rows = await this.db
      .select({
        normalizedQuery: searchDemandDaily.normalizedQuery,
        vertical: sql<Vertical | null>`max(${searchDemandDaily.vertical}::text)`,
        searches: total,
        zeroResults: zero,
        lastSearchedAt: sql<Date>`max(${searchDemandDaily.lastSearchedAt})`,
      })
      .from(searchDemandDaily)
      .where(and(...conditions))
      .groupBy(searchDemandDaily.normalizedQuery)
      .having(zeroOnly ? sql`${zero} > 0` : undefined)
      .orderBy(desc(zeroOnly ? zero : total))
      .limit(50);
    return rows.map((r) => ({ ...r, lastSearchedAt: new Date(r.lastSearchedAt).toISOString() }));
  }

  async opportunities(citySlug: string, days: number): Promise<Opportunity[]> {
    const city = await this.cities.getBySlug(citySlug);
    const [demand, supply] = await Promise.all([
      this.db
        .select({
          vertical: searchDemandDaily.vertical,
          searches: sql<number>`sum(${searchDemandDaily.searches})::int`,
          zeroResults: sql<number>`sum(${searchDemandDaily.zeroResults})::int`,
        })
        .from(searchDemandDaily)
        .where(and(eq(searchDemandDaily.cityId, city.id), gte(searchDemandDaily.day, isoDay(daysAgo(days)))))
        .groupBy(searchDemandDaily.vertical),
      this.db
        .select({ vertical: businesses.vertical, n: sql<number>`count(*)::int` })
        .from(businesses)
        .where(and(eq(businesses.cityId, city.id), eq(businesses.status, 'active')))
        .groupBy(businesses.vertical),
    ]);
    const supplyBy = new Map(supply.map((s) => [s.vertical, s.n]));
    return demand
      .map((d) => {
        const activeSupply = d.vertical ? (supplyBy.get(d.vertical) ?? 0) : 0;
        const zeroRate = d.searches ? d.zeroResults / d.searches : 0;
        return {
          vertical: d.vertical,
          searches: d.searches,
          zeroResults: d.zeroResults,
          activeSupply,
          score: Math.round(((d.searches * (0.5 + zeroRate)) / (activeSupply + 1)) * 100) / 100,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async merchantOverview(user: AuthUser, businessId: string) {
    await this.access.require(user, businessId, 'analytics.view');
    const since = daysAgo(30);
    const completed = inArray(orders.status, [...COMPLETED]);
    const [[totals], topProducts, customers] = await Promise.all([
      this.db
        .select({
          orders: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${completed})::int`,
          cancelled: sql<number>`count(*) filter (where ${inArray(orders.status, ['cancelled', 'rejected'])})::int`,
          revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${completed}), 0)::bigint`,
        })
        .from(orders)
        .where(and(eq(orders.businessId, businessId), gte(orders.createdAt, since))),
      this.db
        .select({
          productId: orderItems.productId,
          name: sql<string>`max(${orderItems.name})`,
          quantity: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::bigint`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orders.businessId, businessId), gte(orders.createdAt, since), completed))
        .groupBy(orderItems.productId)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
      this.db
        .select({
          ordersCount: customerRelationships.ordersCount,
          lastOrderAt: customerRelationships.lastOrderAt,
          createdAt: customerRelationships.createdAt,
        })
        .from(customerRelationships)
        .where(eq(customerRelationships.businessId, businessId)),
    ]);

    const segments = Object.fromEntries(
      ['vip', 'loyal', 'new', 'at_risk', 'dormant', 'occasional'].map((s) => [s, 0]),
    ) as Record<CustomerSegment, number>;
    for (const c of customers) segments[segmentOf(c)]++;

    const revenue = Number(totals?.revenue ?? 0);
    const done = totals?.completed ?? 0;
    return {
      periodDays: 30,
      orders: totals?.orders ?? 0,
      completedOrders: done,
      cancelledOrders: totals?.cancelled ?? 0,
      revenue,
      averageOrderValue: done ? Math.round(revenue / done) : 0,
      customers: customers.length,
      segments,
      topProducts: topProducts.map((p) => ({ ...p, revenue: Number(p.revenue) })),
    };
  }

  /**
   * "AI for the merchant" (blueprint §15.2), deterministic edition: actionable
   * alerts computed from the merchant's own data. Cheap enough to run on every visit.
   */
  async smartInsights(user: AuthUser, businessId: string): Promise<SmartInsight[]> {
    await this.access.require(user, businessId, 'orders.view');
    const since = daysAgo(30);
    const [lowStock, slow, [cancel], customerRows, [pending], [catalog]] = await Promise.all([
      this.db
        .select({ name: products.name, stock: products.stock })
        .from(products)
        .where(and(eq(products.businessId, businessId), isNull(products.deletedAt), eq(products.isAvailable, true), isNotNull(products.stock), lte(products.stock, 5)))
        .limit(10),
      this.db
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            eq(products.businessId, businessId),
            isNull(products.deletedAt),
            lt(products.createdAt, daysAgo(14)),
            sql`not exists (select 1 from ${orderItems} oi join ${orders} o on o.id = oi.order_id
                 where oi.product_id = ${products.id} and o.created_at >= ${since} and o.status in ('delivered','picked_up'))`,
          ),
        )
        .limit(10),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          cancelled: sql<number>`count(*) filter (where ${inArray(orders.status, ['cancelled', 'rejected'])})::int`,
        })
        .from(orders)
        .where(and(eq(orders.businessId, businessId), gte(orders.createdAt, since))),
      this.db
        .select({ ordersCount: customerRelationships.ordersCount, lastOrderAt: customerRelationships.lastOrderAt, createdAt: customerRelationships.createdAt })
        .from(customerRelationships)
        .where(and(eq(customerRelationships.businessId, businessId), isNotNull(customerRelationships.lastOrderAt))),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(eq(bookings.businessId, businessId), eq(bookings.status, 'pending'), gte(bookings.startsAt, sql`now()`))),
      this.db
        .select({ acceptsOrders: businesses.acceptsOrders, products: sql<number>`(select count(*) from ${products} where ${products.businessId} = ${businessId} and ${products.deletedAt} is null)::int` })
        .from(businesses)
        .where(eq(businesses.id, businessId)),
    ]);

    const out: SmartInsight[] = [];
    if (catalog?.acceptsOrders && catalog.products === 0) {
      out.push({ kind: 'no_catalog', severity: 'critical', title: 'تستقبل الطلبات بدون قائمة منتجات', detail: 'أضف منتجاتك ليتمكن الزبائن من الطلب.' });
    }
    if (pending?.n) {
      out.push({ kind: 'pending_bookings', severity: 'warning', title: `${pending.n} حجز بانتظار تأكيدك`, detail: 'التأكيد السريع يرفع نسبة الحضور ورضا الزبائن.' });
    }
    if (lowStock.length) {
      out.push({ kind: 'low_stock', severity: lowStock.some((p) => p.stock === 0) ? 'critical' : 'warning', title: 'مخزون منخفض', detail: lowStock.map((p) => `${p.name} (${p.stock})`).join('، ') });
    }
    if (cancel && cancel.total >= 5 && cancel.cancelled / cancel.total > 0.2) {
      out.push({ kind: 'cancellations', severity: 'warning', title: `نسبة إلغاء مرتفعة: ${Math.round((cancel.cancelled / cancel.total) * 100)}٪`, detail: 'راجع أوقات التحضير وتوفر المنتجات خلال آخر 30 يوماً.' });
    }
    const atRisk = customerRows.filter((c) => ['at_risk', 'dormant'].includes(segmentOf(c))).length;
    if (atRisk) {
      out.push({ kind: 'at_risk_customers', severity: 'info', title: `${atRisk} زبون لم يطلب منذ أكثر من شهر`, detail: 'جرّب كوبون عودة أو رسالة للمتابعين.' });
    }
    if (slow.length) {
      out.push({ kind: 'slow_product', severity: 'info', title: 'منتجات بلا مبيعات خلال 30 يوماً', detail: slow.map((p) => p.name).join('، ') });
    }
    return out;
  }

  async customers(user: AuthUser, businessId: string, cursor: string | undefined, limit: number) {
    await this.access.require(user, businessId, 'customers.view');
    const conditions: SQL[] = [eq(customerRelationships.businessId, businessId)];
    const after = decodeCursor<[string, string]>(cursor, 2);
    if (after) {
      const [lastOrderAt, userId] = after;
      conditions.push(
        or(
          lt(customerRelationships.lastOrderAt, new Date(lastOrderAt)),
          and(eq(customerRelationships.lastOrderAt, new Date(lastOrderAt)), lt(customerRelationships.userId, userId)),
        )!,
      );
    }
    const rows = await this.db
      .select({ rel: customerRelationships, name: users.name })
      .from(customerRelationships)
      .innerJoin(users, eq(users.id, customerRelationships.userId))
      .where(and(...conditions))
      .orderBy(desc(customerRelationships.lastOrderAt), desc(customerRelationships.userId))
      .limit(limit + 1);
    // Phone numbers are shared only with explicit consent (blueprint §8.1).
    const page: Page<unknown> = toPage(
      rows,
      limit,
      ({ rel, name }) => ({
        userId: rel.userId,
        name,
        ordersCount: rel.ordersCount,
        totalSpent: rel.totalSpent,
        lastOrderAt: rel.lastOrderAt?.toISOString() ?? null,
        segment: segmentOf(rel),
        marketingConsent: rel.consentedAt !== null && rel.revokedAt === null,
      }),
      (r) => [(r.rel.lastOrderAt ?? r.rel.createdAt).toISOString(), r.rel.userId],
    );
    return page;
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
