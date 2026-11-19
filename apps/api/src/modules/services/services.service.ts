import { Inject, Injectable } from '@nestjs/common';
import {
  type CreateQuoteInput,
  type CreateServiceRequestInput,
  createServiceRequestSchema,
  type Page,
  type ServiceQuote,
  type ServiceRequest,
  type UpdateServiceStatusInput,
} from '@dari/contracts';
import { aliasedTable, and, desc, eq, inArray, lt, ne, or, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { newReference } from '../../common/reference';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, businessMembers, categories, serviceQuotes, serviceRequests, users } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { roleAllows } from '../directory/business-permissions';
import { OutboxService } from '../platform/outbox.service';
import { customerCanCancel, providerCanMove } from './service-lifecycle';

const provider = aliasedTable(businesses, 'provider');

type RequestRow = {
  request: typeof serviceRequests.$inferSelect;
  categoryName: string;
  areaName: string | null;
  customerName: string | null;
  customerPhone: string;
  providerName: string | null;
  providerSlug: string | null;
  providerPhone: string | null;
};

/**
 * Provider OS (blueprint §9): a citizen describes a need, matching providers
 * quote, the citizen picks one, the provider reports progress to completion.
 */
@Injectable()
export class ServiceRequestsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cities: CitiesService,
    private readonly access: BusinessAccessService,
    private readonly outbox: OutboxService,
  ) {}

  async create(user: AuthUser, input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const data = createServiceRequestSchema.parse(input);
    const city = await this.cities.getBySlug(data.citySlug);
    const [category] = await this.db.select().from(categories).where(eq(categories.id, data.categoryId));
    if (!category) throw new ValidationError('التصنيف غير موجود');
    if (data.targetBusinessId) {
      const [target] = await this.db.select().from(businesses).where(and(eq(businesses.id, data.targetBusinessId), eq(businesses.status, 'active'), eq(businesses.cityId, city.id)));
      if (!target) throw new ValidationError('مقدم الخدمة غير متاح');
    }

    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(serviceRequests)
        .values({
          number: newReference('S'),
          cityId: city.id,
          customerId: user.id,
          categoryId: data.categoryId,
          targetBusinessId: data.targetBusinessId ?? null,
          areaId: data.areaId ?? null,
          description: data.description,
          address: data.address,
          urgency: data.urgency,
          preferredAt: data.preferredAt ?? null,
        })
        .returning({ id: serviceRequests.id, number: serviceRequests.number });
      await this.outbox.record(tx, {
        type: 'service.requested',
        aggregateId: row!.id,
        payload: { cityId: city.id, categoryId: data.categoryId, targetBusinessId: data.targetBusinessId ?? null, number: row!.number },
      });
      return row!.id;
    });
    return this.get(user, id);
  }

  async listMine(user: AuthUser, cursor: string | undefined, limit: number): Promise<Page<ServiceRequest>> {
    return this.page([eq(serviceRequests.customerId, user.id)], cursor, limit, true);
  }

  /** Open requests matching the provider's category (or targeted at it), plus its active jobs. */
  async providerInbox(user: AuthUser, businessId: string, cursor: string | undefined, limit: number): Promise<Page<ServiceRequest>> {
    await this.access.require(user, businessId, 'services.respond');
    const [business] = await this.db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) throw new NotFoundError('النشاط التجاري');
    const matches: SQL[] = [eq(serviceRequests.targetBusinessId, businessId)];
    if (business.categoryId) {
      matches.push(and(eq(serviceRequests.categoryId, business.categoryId), eq(serviceRequests.cityId, business.cityId))!);
    }
    const visible = or(
      and(eq(serviceRequests.status, 'open'), or(...matches))!,
      and(eq(serviceRequests.providerBusinessId, businessId), ne(serviceRequests.status, 'open'))!,
    )!;
    return this.page([visible], cursor, limit, false, businessId);
  }

  async get(user: AuthUser, id: string): Promise<ServiceRequest> {
    const [row] = await this.base(this.db).where(eq(serviceRequests.id, id)).limit(1);
    if (!row) throw new NotFoundError('طلب الخدمة');
    const privileged = row.request.customerId === user.id || user.role === 'admin';
    const viewerBusinessId = privileged ? null : await this.viewerBusiness(user.id, row.request);
    if (!privileged && !viewerBusinessId) throw new ForbiddenError();
    const [hydrated] = await this.hydrate([row], viewerBusinessId);
    return hydrated!;
  }

  async quote(user: AuthUser, requestId: string, input: CreateQuoteInput): Promise<ServiceRequest> {
    const role = await this.access.roleOf(user.id, input.businessId);
    if (!role || !roleAllows(role, 'services.respond')) throw new ForbiddenError();
    const [business] = await this.db.select().from(businesses).where(eq(businesses.id, input.businessId));
    const [request] = await this.db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId));
    if (!request || !business) throw new NotFoundError('طلب الخدمة');
    if (request.status !== 'open') throw new ConflictError('الطلب لم يعد مفتوحاً', 'REQUEST_CLOSED');
    if (request.customerId === user.id) throw new ForbiddenError('لا يمكنك تقديم عرض على طلبك');
    const eligible = request.targetBusinessId ? request.targetBusinessId === business.id : business.categoryId === request.categoryId && business.cityId === request.cityId;
    if (!eligible || business.status !== 'active') throw new ForbiddenError('هذا الطلب خارج اختصاص نشاطك');

    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(serviceQuotes)
        .values({ requestId, businessId: business.id, createdById: user.id, priceMin: input.priceMin, priceMax: input.priceMax, etaMinutes: input.etaMinutes, message: input.message ?? null })
        .onConflictDoNothing({ target: [serviceQuotes.requestId, serviceQuotes.businessId] })
        .returning({ id: serviceQuotes.id });
      if (!row) throw new ConflictError('قدّمت عرضاً على هذا الطلب مسبقاً', 'ALREADY_QUOTED');
      await this.outbox.record(tx, { type: 'service.quoted', aggregateId: requestId, payload: { customerId: request.customerId, businessName: business.name, number: request.number } });
    });
    return this.get(user, requestId);
  }

  /** Customer picks a quote. Compare-and-set on status keeps it single-winner. */
  async acceptQuote(user: AuthUser, requestId: string, quoteId: string): Promise<ServiceRequest> {
    await this.db.transaction(async (tx) => {
      const [quote] = await tx.select().from(serviceQuotes).where(and(eq(serviceQuotes.id, quoteId), eq(serviceQuotes.requestId, requestId)));
      if (!quote || quote.status !== 'pending') throw new NotFoundError('العرض');
      const [request] = await tx
        .update(serviceRequests)
        .set({ status: 'assigned', providerBusinessId: quote.businessId })
        .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.customerId, user.id), eq(serviceRequests.status, 'open')))
        .returning();
      if (!request) throw new ConflictError('لا يمكن قبول العرض الآن', 'REQUEST_CLOSED');
      await tx.update(serviceQuotes).set({ status: 'accepted' }).where(eq(serviceQuotes.id, quoteId));
      await tx.update(serviceQuotes).set({ status: 'declined' }).where(and(eq(serviceQuotes.requestId, requestId), ne(serviceQuotes.id, quoteId)));
      await this.outbox.record(tx, {
        type: 'service.status_changed',
        aggregateId: requestId,
        payload: { customerId: request.customerId, providerBusinessId: quote.businessId, number: request.number, to: 'assigned' },
      });
    });
    return this.get(user, requestId);
  }

  async changeStatus(user: AuthUser, requestId: string, input: UpdateServiceStatusInput): Promise<ServiceRequest> {
    await this.db.transaction(async (tx) => {
      const [request] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).for('update');
      if (!request) throw new NotFoundError('طلب الخدمة');
      const isCustomer = request.customerId === user.id;

      if (input.status === 'cancelled' && isCustomer) {
        if (!customerCanCancel(request.status)) throw new ConflictError('لا يمكن إلغاء الطلب الآن', 'INVALID_TRANSITION');
      } else {
        if (!request.providerBusinessId) throw new ForbiddenError();
        const role = await this.access.roleOf(user.id, request.providerBusinessId);
        if (!role || !roleAllows(role, 'services.respond')) throw new ForbiddenError();
        if (!providerCanMove(request.status, input.status)) {
          throw new ConflictError('لا يمكن تغيير حالة الطلب بهذا الشكل', 'INVALID_TRANSITION', { from: request.status, to: input.status });
        }
      }

      await tx
        .update(serviceRequests)
        .set({
          status: input.status,
          ...(input.status === 'completed' && { completedAt: new Date(), finalPrice: input.finalPrice ?? null }),
        })
        .where(eq(serviceRequests.id, requestId));
      if (input.status === 'cancelled') {
        await tx.update(serviceQuotes).set({ status: 'withdrawn' }).where(and(eq(serviceQuotes.requestId, requestId), eq(serviceQuotes.status, 'pending')));
      }
      await this.outbox.record(tx, {
        type: 'service.status_changed',
        aggregateId: requestId,
        payload: { customerId: request.customerId, providerBusinessId: request.providerBusinessId, number: request.number, to: input.status },
      });
    });
    return this.get(user, requestId);
  }

  // ── Read model ───────────────────────────────────────────────────────────
  private base(db: DbExecutor) {
    return db
      .select({
        request: serviceRequests,
        categoryName: categories.nameAr,
        areaName: areas.nameAr,
        customerName: users.name,
        customerPhone: users.phone,
        providerName: provider.name,
        providerSlug: provider.slug,
        providerPhone: provider.phone,
      })
      .from(serviceRequests)
      .innerJoin(categories, eq(categories.id, serviceRequests.categoryId))
      .innerJoin(users, eq(users.id, serviceRequests.customerId))
      .leftJoin(areas, eq(areas.id, serviceRequests.areaId))
      .leftJoin(provider, eq(provider.id, serviceRequests.providerBusinessId));
  }

  private async page(conditions: SQL[], cursor: string | undefined, limit: number, asCustomer: boolean, viewerBusinessId?: string): Promise<Page<ServiceRequest>> {
    const after = decodeCursor<[string]>(cursor, 1);
    if (after) conditions.push(lt(serviceRequests.id, after[0]));
    const rows = await this.base(this.db).where(and(...conditions)).orderBy(desc(serviceRequests.id)).limit(limit + 1);
    const page = toPage(rows, limit, (r) => r, (r) => [r.request.id]);
    return { items: await this.hydrate(page.items, asCustomer ? null : (viewerBusinessId ?? null)), nextCursor: page.nextCursor };
  }

  /**
   * @param viewerBusinessId when a provider is viewing: only its own quote is shown and
   * the customer's phone is revealed only after assignment (privacy, blueprint §16).
   */
  private async hydrate(rows: RequestRow[], viewerBusinessId: string | null): Promise<ServiceRequest[]> {
    if (!rows.length) return [];
    const quoteRows = await this.db
      .select({ quote: serviceQuotes, name: businesses.name, slug: businesses.slug, ratingAvg: businesses.ratingAvg })
      .from(serviceQuotes)
      .innerJoin(businesses, eq(businesses.id, serviceQuotes.businessId))
      .where(inArray(serviceQuotes.requestId, rows.map((r) => r.request.id)));
    const byRequest = Map.groupBy(quoteRows, (q) => q.quote.requestId);

    return rows.map((r) => {
      const req = r.request;
      const providerView = viewerBusinessId !== null;
      const quotes: ServiceQuote[] = (byRequest.get(req.id) ?? [])
        .filter((q) => !providerView || q.quote.businessId === viewerBusinessId)
        .map((q) => ({
          id: q.quote.id,
          businessId: q.quote.businessId,
          businessName: q.name,
          businessSlug: q.slug,
          ratingAvg: Math.round(q.ratingAvg * 10) / 10,
          priceMin: q.quote.priceMin,
          priceMax: q.quote.priceMax,
          etaMinutes: q.quote.etaMinutes,
          message: q.quote.message,
          status: q.quote.status,
          createdAt: q.quote.createdAt.toISOString(),
        }));
      const assignedToViewer = providerView && req.providerBusinessId === viewerBusinessId;
      return {
        id: req.id,
        number: req.number,
        categoryId: req.categoryId,
        categoryName: r.categoryName,
        customerId: req.customerId,
        customerName: r.customerName,
        customerPhone: !providerView || assignedToViewer ? r.customerPhone : null,
        description: req.description,
        address: !providerView || assignedToViewer ? req.address : (r.areaName ?? 'سلمية'),
        areaName: r.areaName,
        urgency: req.urgency,
        preferredAt: req.preferredAt?.toISOString() ?? null,
        status: req.status,
        provider: req.providerBusinessId && r.providerName ? { id: req.providerBusinessId, name: r.providerName, slug: r.providerSlug!, phone: r.providerPhone } : null,
        finalPrice: req.finalPrice,
        quotes,
        createdAt: req.createdAt.toISOString(),
      };
    });
  }

  /**
   * The business through which a provider-side user may see this request:
   * assigned, targeted, already quoted, or (while open) matching its category.
   */
  private async viewerBusiness(userId: string, req: typeof serviceRequests.$inferSelect): Promise<string | null> {
    const memberships = await this.db
      .select({ id: businesses.id, categoryId: businesses.categoryId, cityId: businesses.cityId })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
      .where(eq(businessMembers.userId, userId));
    if (!memberships.length) return null;
    const ids = memberships.map((m) => m.id);
    const direct = ids.find((b) => b === req.providerBusinessId) ?? ids.find((b) => b === req.targetBusinessId);
    if (direct) return direct;
    const [quoted] = await this.db
      .select({ businessId: serviceQuotes.businessId })
      .from(serviceQuotes)
      .where(and(eq(serviceQuotes.requestId, req.id), inArray(serviceQuotes.businessId, ids)))
      .limit(1);
    if (quoted) return quoted.businessId;
    if (req.status !== 'open' || req.targetBusinessId) return null;
    return memberships.find((m) => m.categoryId === req.categoryId && m.cityId === req.cityId)?.id ?? null;
  }
}
