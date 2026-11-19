import { Inject, Injectable } from '@nestjs/common';
import {
  type Connection,
  type Coupon,
  couponDiscount,
  type CreateBroadcastInput,
  type CreateCouponInput,
  createCouponSchema,
  type Favorite,
  type FavoriteInput,
} from '@dari/contracts';
import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import {
  broadcasts,
  businesses,
  cityEvents,
  coupons,
  customerRelationships,
  favorites,
  propertyListings,
} from '../../infrastructure/database/schema';
import { BusinessAccessService } from '../directory/business-access.service';
import { BusinessesRepository } from '../directory/businesses.repository';
import { BusinessesService } from '../directory/businesses.service';
import { PlansService } from '../directory/plans.service';
import { OutboxService } from '../platform/outbox.service';

type CouponRow = typeof coupons.$inferSelect;
const BROADCAST_COOLDOWN_HOURS = 24;

/**
 * Merchant marketing & citizen loyalty (blueprint §7.1 Marketing, §8 Customer Connect):
 * consented relationships, broadcasts without exposing contacts, coupons, favorites.
 */
@Injectable()
export class MarketingService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly businesses: BusinessesService,
    private readonly repo: BusinessesRepository,
    private readonly access: BusinessAccessService,
    private readonly plans: PlansService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Customer Connect ─────────────────────────────────────────────────────
  /** Explicit opt-in (QR / link). Re-consent after a revoke is allowed. */
  async connect(user: AuthUser, businessId: string): Promise<void> {
    await this.businesses.getActiveById(businessId);
    await this.db
      .insert(customerRelationships)
      .values({ businessId, userId: user.id, source: 'connect', consentedAt: new Date() })
      .onConflictDoUpdate({
        target: [customerRelationships.businessId, customerRelationships.userId],
        set: { consentedAt: sql`now()`, revokedAt: null },
      });
  }

  async disconnect(user: AuthUser, businessId: string): Promise<void> {
    await this.db
      .update(customerRelationships)
      .set({ revokedAt: new Date() })
      .where(and(eq(customerRelationships.businessId, businessId), eq(customerRelationships.userId, user.id)));
  }

  async connections(user: AuthUser): Promise<Connection[]> {
    const rows = await this.db
      .select({ businessId: customerRelationships.businessId, consentedAt: customerRelationships.consentedAt })
      .from(customerRelationships)
      .where(and(eq(customerRelationships.userId, user.id), isNotNull(customerRelationships.consentedAt), isNull(customerRelationships.revokedAt)));
    const summaries = await this.repo.findSummariesByIds(rows.map((r) => r.businessId));
    return rows
      .filter((r) => summaries.has(r.businessId))
      .map((r) => ({ business: summaries.get(r.businessId)!, consentedAt: r.consentedAt!.toISOString() }));
  }

  async audienceSize(user: AuthUser, businessId: string): Promise<{ consented: number }> {
    await this.access.require(user, businessId, 'customers.view');
    return { consented: await this.consentedCount(this.db, businessId) };
  }

  // ── Broadcasts ───────────────────────────────────────────────────────────
  async broadcast(user: AuthUser, businessId: string, input: CreateBroadcastInput): Promise<{ audience: number }> {
    await this.access.require(user, businessId, 'marketing.write');
    await this.plans.assertFeature(businessId, 'broadcasts');
    const business = await this.businesses.getActiveById(businessId);
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`broadcast:${businessId}`}, 0))`);
      const [recent] = await tx
        .select({ id: broadcasts.id })
        .from(broadcasts)
        .where(and(eq(broadcasts.businessId, businessId), gt(broadcasts.createdAt, sql`now() - make_interval(hours => ${BROADCAST_COOLDOWN_HOURS})`)))
        .limit(1);
      if (recent) throw new ConflictError('يمكن إرسال رسالة واحدة يومياً لحماية الزبائن من الإزعاج', 'BROADCAST_COOLDOWN');
      const audience = await this.consentedCount(tx, businessId);
      const [row] = await tx.insert(broadcasts).values({ businessId, createdById: user.id, title: input.title, body: input.body, audienceCount: audience }).returning({ id: broadcasts.id });
      await this.outbox.record(tx, { type: 'broadcast.created', aggregateId: row!.id, payload: { businessId, businessName: business.name, title: input.title, body: input.body } });
      return { audience };
    });
  }

  async listBroadcasts(user: AuthUser, businessId: string) {
    await this.access.require(user, businessId, 'marketing.write');
    const rows = await this.db.select().from(broadcasts).where(eq(broadcasts.businessId, businessId)).orderBy(desc(broadcasts.id)).limit(30);
    return rows.map((b) => ({ id: b.id, title: b.title, body: b.body, audienceCount: b.audienceCount, createdAt: b.createdAt.toISOString() }));
  }

  // ── Coupons ──────────────────────────────────────────────────────────────
  async createCoupon(user: AuthUser, businessId: string, input: CreateCouponInput): Promise<Coupon> {
    await this.access.require(user, businessId, 'marketing.write');
    await this.plans.assertFeature(businessId, 'coupons');
    const data = createCouponSchema.parse(input);
    const [row] = await this.db
      .insert(coupons)
      .values({ ...data, businessId, startsAt: data.startsAt ?? null, endsAt: data.endsAt ?? null })
      .onConflictDoNothing({ target: [coupons.businessId, coupons.code] })
      .returning();
    if (!row) throw new ConflictError('الكود مستخدم مسبقاً', 'DUPLICATE_CODE');
    return toCoupon(row);
  }

  async listCoupons(user: AuthUser, businessId: string): Promise<Coupon[]> {
    await this.access.require(user, businessId, 'marketing.write');
    const rows = await this.db.select().from(coupons).where(eq(coupons.businessId, businessId)).orderBy(desc(coupons.createdAt));
    return rows.map(toCoupon);
  }

  async setCouponActive(user: AuthUser, businessId: string, couponId: string, isActive: boolean): Promise<void> {
    await this.access.require(user, businessId, 'marketing.write');
    await this.db.update(coupons).set({ isActive }).where(and(eq(coupons.id, couponId), eq(coupons.businessId, businessId)));
  }

  /** Public offers shown on the business page. */
  async publicOffers(businessId: string): Promise<Coupon[]> {
    const rows = await this.db.select().from(coupons).where(and(eq(coupons.businessId, businessId), eq(coupons.isPublic, true), ...activeCouponConditions()));
    return rows.filter((c) => c.maxUses === null || c.usedCount < c.maxUses).map(toCoupon);
  }

  async previewCoupon(businessId: string, code: string, subtotal: number): Promise<{ code: string; title: string; discount: number }> {
    const coupon = await this.findUsable(this.db, businessId, code);
    const discount = couponDiscount(coupon, subtotal);
    if (!discount) throw new ConflictError(`الحد الأدنى للطلب ${coupon.minOrder.toLocaleString('ar-SY')}`, 'COUPON_MIN_ORDER');
    return { code: coupon.code, title: coupon.title, discount };
  }

  /**
   * Consumes one coupon use inside the order transaction. The conditional
   * UPDATE guarantees `max_uses` is never exceeded under concurrency.
   */
  async redeem(tx: DbExecutor, businessId: string, code: string, subtotal: number): Promise<{ couponId: string; discount: number }> {
    const coupon = await this.findUsable(tx, businessId, code);
    const discount = couponDiscount(coupon, subtotal);
    if (!discount) throw new ConflictError(`الحد الأدنى للطلب ${coupon.minOrder.toLocaleString('ar-SY')}`, 'COUPON_MIN_ORDER');
    const [used] = await tx
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(and(eq(coupons.id, coupon.id), or(isNull(coupons.maxUses), sql`${coupons.usedCount} < ${coupons.maxUses}`)))
      .returning({ id: coupons.id });
    if (!used) throw new ConflictError('انتهت استخدامات هذا الكوبون', 'COUPON_EXHAUSTED');
    return { couponId: coupon.id, discount };
  }

  async release(tx: DbExecutor, couponId: string): Promise<void> {
    await tx.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` }).where(eq(coupons.id, couponId));
  }

  private async findUsable(db: DbExecutor, businessId: string, code: string): Promise<CouponRow> {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.businessId, businessId), eq(coupons.code, code.toUpperCase()), ...activeCouponConditions()));
    if (!coupon) throw new NotFoundError('الكوبون');
    return coupon;
  }

  // ── Favorites ────────────────────────────────────────────────────────────
  async addFavorite(user: AuthUser, input: FavoriteInput): Promise<void> {
    await this.db.insert(favorites).values({ userId: user.id, ...input }).onConflictDoNothing();
  }

  async removeFavorite(user: AuthUser, input: FavoriteInput): Promise<void> {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.entityType, input.entityType), eq(favorites.entityId, input.entityId)));
  }

  async listFavorites(user: AuthUser): Promise<Favorite[]> {
    const rows = await this.db.select().from(favorites).where(eq(favorites.userId, user.id)).orderBy(desc(favorites.createdAt)).limit(200);
    const ids = (type: string) => rows.filter((r) => r.entityType === type).map((r) => r.entityId);
    const [biz, listings, events] = await Promise.all([
      ids('business').length ? this.db.select({ id: businesses.id, title: businesses.name, slug: businesses.slug, vertical: businesses.vertical }).from(businesses).where(inArray(businesses.id, ids('business'))) : [],
      ids('listing').length ? this.db.select({ id: propertyListings.id, title: propertyListings.title }).from(propertyListings).where(inArray(propertyListings.id, ids('listing'))) : [],
      ids('event').length ? this.db.select({ id: cityEvents.id, title: cityEvents.title, kind: cityEvents.kind }).from(cityEvents).where(inArray(cityEvents.id, ids('event'))) : [],
    ]);
    const lookup = new Map<string, Omit<Favorite, 'createdAt' | 'entityType' | 'entityId'>>([
      ...biz.map((b) => [b.id, { title: b.title, href: `/b/${b.slug}`, vertical: b.vertical }] as const),
      ...listings.map((l) => [l.id, { title: l.title, href: `/property/${l.id}`, vertical: 'property' as const }] as const),
      ...events.map((e) => [e.id, { title: e.title, href: `/events/${e.id}`, vertical: e.kind === 'trip' ? ('trips' as const) : ('events' as const) }] as const),
    ]);
    return rows
      .filter((r) => lookup.has(r.entityId))
      .map((r) => ({ entityType: r.entityType, entityId: r.entityId, createdAt: r.createdAt.toISOString(), ...lookup.get(r.entityId)! }));
  }

  async isFavorite(user: AuthUser, input: FavoriteInput): Promise<boolean> {
    const [row] = await this.db
      .select({ id: favorites.entityId })
      .from(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.entityType, input.entityType), eq(favorites.entityId, input.entityId)));
    return Boolean(row);
  }

  private async consentedCount(db: DbExecutor, businessId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(customerRelationships)
      .where(and(eq(customerRelationships.businessId, businessId), isNotNull(customerRelationships.consentedAt), isNull(customerRelationships.revokedAt)));
    return row?.n ?? 0;
  }
}

function activeCouponConditions() {
  return [
    eq(coupons.isActive, true),
    or(isNull(coupons.startsAt), lte(coupons.startsAt, sql`now()`))!,
    or(isNull(coupons.endsAt), gt(coupons.endsAt, sql`now()`))!,
  ];
}

function toCoupon(c: CouponRow): Coupon {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    kind: c.kind,
    value: c.value,
    minOrder: c.minOrder,
    maxDiscount: c.maxDiscount,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    isPublic: c.isPublic,
    isActive: c.isActive,
  };
}
