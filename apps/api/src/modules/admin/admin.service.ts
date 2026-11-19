import { Inject, Injectable } from '@nestjs/common';
import type { PlatformRole, RecordPaymentInput, UserProfile } from '@dari/contracts';
import { desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { NotFoundError, ValidationError } from '../../common/errors/app-error';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { businesses, planPayments, propertyListings, users } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { AuditService } from '../platform/audit.service';
import { toProfile } from '../users/users.service';

const DAY_MS = 86_400_000;

/**
 * Platform administration (blueprint §16, financial doc §4, §8): manual subscription
 * billing, featured placements and staff roles — every action audited.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Records a payment and extends the plan. Renewing the same plan stacks on
   * the remaining period; switching plans starts from now.
   */
  async recordPayment(admin: AuthUser, businessId: string, input: RecordPaymentInput) {
    return this.db.transaction(async (tx) => {
      const [business] = await tx.select().from(businesses).where(eq(businesses.id, businessId)).for('update');
      if (!business) throw new NotFoundError('النشاط التجاري');
      const now = new Date();
      const base = business.plan === input.plan && business.planExpiresAt && business.planExpiresAt > now ? business.planExpiresAt : now;
      const periodEnd = new Date(base.getTime() + input.months * 30 * DAY_MS);
      await tx.update(businesses).set({ plan: input.plan, planExpiresAt: periodEnd }).where(eq(businesses.id, businessId));
      const [payment] = await tx
        .insert(planPayments)
        .values({ businessId, plan: input.plan, months: input.months, amount: input.amount, method: input.method, reference: input.reference ?? null, recordedById: admin.id, periodStart: base, periodEnd })
        .returning();
      await this.audit.record(tx, { actorId: admin.id, action: 'plan.payment', entityType: 'business', entityId: businessId, businessId, changes: { ...input, periodEnd } });
      return { id: payment!.id, plan: input.plan, expiresAt: periodEnd.toISOString() };
    });
  }

  async payments(businessId: string) {
    const rows = await this.db.select().from(planPayments).where(eq(planPayments.businessId, businessId)).orderBy(desc(planPayments.id));
    return rows.map((p) => ({ id: p.id, plan: p.plan, months: p.months, amount: p.amount, method: p.method, reference: p.reference, periodEnd: p.periodEnd.toISOString(), createdAt: p.createdAt.toISOString() }));
  }

  async revenueSummary() {
    const [row] = await this.db
      .select({
        total30d: sql<number>`coalesce(sum(${planPayments.amount}) filter (where ${planPayments.createdAt} > now() - interval '30 days'), 0)::bigint`,
        paying: sql<number>`(select count(*) from ${businesses} where ${businesses.plan} <> 'free' and ${businesses.planExpiresAt} > now())::int`,
      })
      .from(planPayments);
    return { subscriptionRevenue30d: Number(row?.total30d ?? 0), payingBusinesses: row?.paying ?? 0 };
  }

  async featureBusiness(admin: AuthUser, businessId: string, days: number) {
    const featuredUntil = days > 0 ? new Date(Date.now() + days * DAY_MS) : null;
    const [row] = await this.db.update(businesses).set({ featuredUntil }).where(eq(businesses.id, businessId)).returning({ slug: businesses.slug });
    if (!row) throw new NotFoundError('النشاط التجاري');
    await this.audit.record(this.db, { actorId: admin.id, action: 'business.featured', entityType: 'business', entityId: businessId, businessId, changes: { days } });
    await this.cache.invalidate(`business:page:${row.slug}`);
    return { featuredUntil: featuredUntil?.toISOString() ?? null };
  }

  async featureListing(admin: AuthUser, listingId: string, days: number) {
    const featuredUntil = days > 0 ? new Date(Date.now() + days * DAY_MS) : null;
    const [row] = await this.db.update(propertyListings).set({ featuredUntil }).where(eq(propertyListings.id, listingId)).returning({ id: propertyListings.id });
    if (!row) throw new NotFoundError('العقار');
    await this.audit.record(this.db, { actorId: admin.id, action: 'listing.featured', entityType: 'listing', entityId: listingId, changes: { days } });
    return { featuredUntil: featuredUntil?.toISOString() ?? null };
  }

  async findUserByPhone(phone: string): Promise<UserProfile> {
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone));
    if (!row) throw new NotFoundError('المستخدم');
    return toProfile(row);
  }

  async setRole(admin: AuthUser, userId: string, role: PlatformRole): Promise<UserProfile> {
    if (userId === admin.id && role !== 'admin') throw new ValidationError('لا يمكنك إزالة صلاحية الإدارة عن نفسك');
    const [row] = await this.db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    if (!row) throw new NotFoundError('المستخدم');
    await this.audit.record(this.db, { actorId: admin.id, action: 'user.role', entityType: 'user', entityId: userId, changes: { role } });
    return toProfile(row);
  }
}
