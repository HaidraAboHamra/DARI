import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  type AddMemberInput,
  type BusinessDetail,
  type BusinessRole,
  type BusinessStatus,
  type CreateBusinessInput,
  type ListBusinessesQuery,
  type Membership,
  type Page,
  type BusinessSummary,
  slugify,
  type UpdateBusinessInput,
} from '@dari/contracts';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/app-error';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, businessMembers, categories, users } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { CitiesService } from '../cities/cities.service';
import { AuditService } from '../platform/audit.service';
import { OutboxService } from '../platform/outbox.service';
import { UsersService } from '../users/users.service';
import { BusinessAccessService } from './business-access.service';
import { BusinessesRepository } from './businesses.repository';
import { buildSearchText } from './search-text';

const PAGE_CACHE_TTL = 60;

@Injectable()
export class BusinessesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly repo: BusinessesRepository,
    private readonly access: BusinessAccessService,
    private readonly cities: CitiesService,
    private readonly users: UsersService,
    private readonly cache: CacheService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListBusinessesQuery): Promise<Page<BusinessSummary>> {
    const city = await this.cities.getBySlug(query.city);
    return this.repo.listActive({ ...query, cityId: city.id });
  }

  /** Public business page. Non-active businesses are visible to their members only. */
  async getPublicPage(slug: string, viewer: AuthUser | null): Promise<BusinessDetail> {
    const business = await this.cache.getOrSet(this.pageKey(slug), PAGE_CACHE_TTL, () => this.repo.findBySlug(slug));
    if (!business) throw new NotFoundError('النشاط التجاري');
    if (business.status !== 'active') {
      const allowed = viewer && (viewer.role === 'admin' || (await this.access.roleOf(viewer.id, business.id)));
      if (!allowed) throw new NotFoundError('النشاط التجاري');
    }
    return business;
  }

  async getActiveById(id: string, db?: DbExecutor): Promise<BusinessDetail> {
    const business = await this.repo.findById(id, db);
    if (!business || business.status !== 'active') throw new NotFoundError('النشاط التجاري');
    return business;
  }

  async getForMember(user: AuthUser, id: string): Promise<BusinessDetail & { role: BusinessRole | 'admin' }> {
    const role = await this.access.require(user, id, 'orders.view');
    const business = await this.repo.findById(id, this.db);
    if (!business) throw new NotFoundError('النشاط التجاري');
    return { ...business, role };
  }

  myMemberships(user: AuthUser): Promise<Membership[]> {
    return this.repo.listMemberships(user.id);
  }

  /** Any citizen can register a business; it goes live after verification. */
  async create(user: AuthUser, input: CreateBusinessInput): Promise<BusinessDetail> {
    const city = await this.cities.getBySlug(input.citySlug);
    const refs = await this.resolveReferences(city.id, input.categoryId, input.areaId);
    if (refs.category && refs.category.vertical !== input.vertical) {
      throw new ValidationError('التصنيف لا يتبع القطاع المختار');
    }

    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(businesses)
        .values({
          cityId: city.id,
          slug: uniqueSlug(input.name),
          name: input.name,
          vertical: input.vertical,
          categoryId: input.categoryId ?? null,
          areaId: input.areaId ?? null,
          description: input.description ?? null,
          phone: input.phone ?? null,
          whatsapp: input.whatsapp ?? null,
          address: input.address ?? null,
          lat: input.location?.lat ?? null,
          lng: input.location?.lng ?? null,
          openingHours: input.openingHours ?? [],
          acceptsOrders: input.acceptsOrders ?? false,
          deliveryFee: input.deliveryFee ?? null,
          logoUrl: input.logoUrl ?? null,
          coverUrl: input.coverUrl ?? null,
          status: 'pending_review',
          searchText: buildSearchText(input.name, refs.category?.nameAr, refs.area?.nameAr, input.description),
        })
        .returning({ id: businesses.id });
      const businessId = row!.id;
      await tx.insert(businessMembers).values({ businessId, userId: user.id, role: 'owner' });
      await this.outbox.record(tx, {
        type: 'business.submitted',
        aggregateId: businessId,
        payload: { cityId: city.id, name: input.name },
      });
      await this.audit.record(tx, { actorId: user.id, action: 'business.create', entityType: 'business', entityId: businessId, businessId });
      return businessId;
    });

    return (await this.repo.findById(id, this.db))!;
  }

  async update(user: AuthUser, id: string, input: UpdateBusinessInput): Promise<BusinessDetail> {
    await this.access.require(user, id, 'business.update');
    const current = await this.repo.findById(id, this.db);
    if (!current) throw new NotFoundError('النشاط التجاري');
    const refs = await this.resolveReferences(current.cityId, input.categoryId, input.areaId);

    const { location, ...fields } = input;
    const next = { ...current, ...fields };
    await this.db.transaction(async (tx) => {
      await tx
        .update(businesses)
        .set({
          ...fields,
          ...(location && { lat: location.lat, lng: location.lng }),
          searchText: buildSearchText(
            next.name,
            refs.category?.nameAr ?? current.categoryName,
            refs.area?.nameAr ?? current.areaName,
            next.description,
          ),
        })
        .where(eq(businesses.id, id));
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'business.update',
        entityType: 'business',
        entityId: id,
        businessId: id,
        changes: input as Record<string, unknown>,
      });
    });
    await this.cache.invalidate(this.pageKey(current.slug));
    return (await this.repo.findById(id, this.db))!;
  }

  /** Platform moderation (verification) of a business. */
  async setStatus(admin: AuthUser, id: string, status: BusinessStatus): Promise<BusinessDetail> {
    const current = await this.repo.findById(id, this.db);
    if (!current) throw new NotFoundError('النشاط التجاري');

    await this.db.transaction(async (tx) => {
      await tx
        .update(businesses)
        .set({ status, ...(status === 'active' && !current.isVerified && { verifiedAt: sql`now()` }) })
        .where(eq(businesses.id, id));
      if (status === 'active' && current.status !== 'active') {
        const owners = await tx
          .select({ userId: businessMembers.userId })
          .from(businessMembers)
          .where(and(eq(businessMembers.businessId, id), eq(businessMembers.role, 'owner')));
        await this.outbox.record(tx, {
          type: 'business.approved',
          aggregateId: id,
          payload: { ownerIds: owners.map((o) => o.userId), name: current.name },
        });
      }
      await this.audit.record(tx, {
        actorId: admin.id,
        action: 'business.status',
        entityType: 'business',
        entityId: id,
        businessId: id,
        changes: { from: current.status, to: status },
      });
    });
    await this.cache.invalidate(this.pageKey(current.slug));
    return (await this.repo.findById(id, this.db))!;
  }

  listForModeration(status: BusinessStatus): Promise<BusinessDetail[]> {
    return this.repo.listByStatus(status, 100);
  }

  async listMembers(user: AuthUser, businessId: string) {
    await this.access.require(user, businessId, 'members.view');
    return this.db
      .select({ userId: users.id, name: users.name, phone: users.phone, role: businessMembers.role })
      .from(businessMembers)
      .innerJoin(users, eq(users.id, businessMembers.userId))
      .where(eq(businessMembers.businessId, businessId))
      .orderBy(asc(businessMembers.createdAt));
  }

  async addMember(user: AuthUser, businessId: string, input: AddMemberInput): Promise<void> {
    await this.access.require(user, businessId, 'members.manage');
    const member = await this.users.findOrCreateByPhone(input.phone);
    const existing = await this.access.roleOf(member.id, businessId);
    if (existing === 'owner') throw new ConflictError('لا يمكن تغيير دور المالك');

    await this.db.transaction(async (tx) => {
      await tx
        .insert(businessMembers)
        .values({ businessId, userId: member.id, role: input.role })
        .onConflictDoUpdate({ target: [businessMembers.businessId, businessMembers.userId], set: { role: input.role } });
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'member.upsert',
        entityType: 'user',
        entityId: member.id,
        businessId,
        changes: { role: input.role },
      });
    });
  }

  async removeMember(user: AuthUser, businessId: string, memberId: string): Promise<void> {
    await this.access.require(user, businessId, 'members.manage');
    if ((await this.access.roleOf(memberId, businessId)) === 'owner') {
      throw new ConflictError('لا يمكن إزالة المالك');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .delete(businessMembers)
        .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, memberId)));
      await this.audit.record(tx, { actorId: user.id, action: 'member.remove', entityType: 'user', entityId: memberId, businessId });
    });
  }

  private async resolveReferences(cityId: string, categoryId?: string, areaId?: string) {
    const [category] = categoryId
      ? await this.db.select().from(categories).where(eq(categories.id, categoryId)).limit(1)
      : [];
    if (categoryId && !category) throw new ValidationError('التصنيف غير موجود');
    const [area] = areaId
      ? await this.db.select().from(areas).where(and(eq(areas.id, areaId), eq(areas.cityId, cityId))).limit(1)
      : [];
    if (areaId && !area) throw new ValidationError('المنطقة غير موجودة في هذه المدينة');
    return { category, area };
  }

  private pageKey(slug: string): string {
    return `business:page:${slug}`;
  }
}

/** Human-readable, shareable slug with a short random suffix to stay unique. */
function uniqueSlug(name: string): string {
  const base = slugify(name) || 'business';
  return `${base}-${randomBytes(3).toString('hex')}`;
}
