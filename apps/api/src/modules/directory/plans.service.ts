import { Inject, Injectable } from '@nestjs/common';
import { effectivePlan, type PlanLimits, type Subscription } from '@dari/contracts';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { bookableResources, businesses, businessMembers, products } from '../../infrastructure/database/schema';

type CountedLimit = 'maxProducts' | 'maxMembers' | 'maxResources';
type FeatureFlag = 'coupons' | 'broadcasts' | 'advancedInsights';

const LIMIT_LABEL: Record<CountedLimit, string> = {
  maxProducts: 'عدد المنتجات',
  maxMembers: 'عدد الموظفين',
  maxResources: 'عدد الموارد القابلة للحجز',
};
const FEATURE_LABEL: Record<FeatureFlag, string> = {
  coupons: 'الكوبونات والعروض',
  broadcasts: 'الرسائل للزبائن',
  advancedInsights: 'التحليلات المتقدمة',
};

/** Plan limits (financial doc §6.2): free is useful, growth is what upgrades. */
@Injectable()
export class PlansService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async limitsFor(businessId: string, db: DbExecutor = this.db): Promise<PlanLimits> {
    const [row] = await db
      .select({ plan: businesses.plan, expiresAt: businesses.planExpiresAt })
      .from(businesses)
      .where(eq(businesses.id, businessId));
    if (!row) throw new NotFoundError('النشاط التجاري');
    return effectivePlan(row.plan, row.expiresAt);
  }

  async assertCapacity(businessId: string, limit: CountedLimit, db: DbExecutor = this.db): Promise<void> {
    const plan = await this.limitsFor(businessId, db);
    const used = (await this.usage(businessId, db))[limitKey(limit)];
    if (used >= plan[limit]) {
      throw new ConflictError(`وصلت للحد الأقصى في باقة «${plan.nameAr}» (${LIMIT_LABEL[limit]}: ${plan[limit]}). رقِّ الباقة للمتابعة.`, 'PLAN_LIMIT', {
        limit,
        max: plan[limit],
      });
    }
  }

  async assertFeature(businessId: string, feature: FeatureFlag): Promise<void> {
    const plan = await this.limitsFor(businessId);
    if (!plan[feature]) {
      throw new ConflictError(`ميزة «${FEATURE_LABEL[feature]}» غير متاحة في باقة «${plan.nameAr}».`, 'PLAN_FEATURE', { feature });
    }
  }

  async subscription(businessId: string): Promise<Subscription> {
    const [row] = await this.db
      .select({ plan: businesses.plan, expiresAt: businesses.planExpiresAt })
      .from(businesses)
      .where(eq(businesses.id, businessId));
    if (!row) throw new NotFoundError('النشاط التجاري');
    return {
      plan: row.plan,
      effectivePlan: effectivePlan(row.plan, row.expiresAt).id,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      usage: await this.usage(businessId, this.db),
    };
  }

  private async usage(businessId: string, db: DbExecutor) {
    const count = sql<number>`count(*)::int`;
    const [[p], [m], [r]] = await Promise.all([
      db.select({ n: count }).from(products).where(and(eq(products.businessId, businessId), isNull(products.deletedAt))),
      db.select({ n: count }).from(businessMembers).where(eq(businessMembers.businessId, businessId)),
      db.select({ n: count }).from(bookableResources).where(eq(bookableResources.businessId, businessId)),
    ]);
    return { products: p?.n ?? 0, members: m?.n ?? 0, resources: r?.n ?? 0 };
  }
}

function limitKey(limit: CountedLimit): 'products' | 'members' | 'resources' {
  return ({ maxProducts: 'products', maxMembers: 'members', maxResources: 'resources' } as const)[limit];
}
