import { Inject, Injectable } from '@nestjs/common';
import { type CreateDeliveryInput, type DeliveryStatus, type DeliveryTask, type Page, quoteDelivery } from '@dari/contracts';
import { and, desc, eq, gte, lt, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { businesses, deliveryTasks, orders } from '../../infrastructure/database/schema';
import { CitiesService, cityPricing } from '../cities/cities.service';
import { OutboxService } from '../platform/outbox.service';
import { OrdersService } from '../orders/orders.service';

type TaskRow = typeof deliveryTasks.$inferSelect;

/** Courier-driven transitions and the order status each one implies. */
const COURIER_TRANSITIONS: Partial<Record<DeliveryStatus, { from: DeliveryStatus; order?: 'out_for_delivery' | 'delivered' }>> = {
  picked_up: { from: 'assigned', order: 'out_for_delivery' },
  delivered: { from: 'picked_up', order: 'delivered' },
  failed: { from: 'picked_up' },
};

/**
 * General delivery engine (blueprint §6): merchant orders, parcels between
 * citizens, buy-for-me, documents. Couriers claim tasks from a city board.
 */
@Injectable()
export class DeliveryService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cities: CitiesService,
    private readonly orders: OrdersService,
    private readonly outbox: OutboxService,
  ) {}

  async request(user: AuthUser, input: CreateDeliveryInput): Promise<DeliveryTask> {
    const city = await this.cities.getBySlug(input.citySlug);
    // «توصيل أي شي»: priced by the distance between the two pins when both are set.
    const pricing = cityPricing(city.config);
    const quote = input.pickup.location && input.dropoff.location ? quoteDelivery(pricing, input.pickup.location, input.dropoff.location) : null;
    if (quote && !quote.deliverable) {
      throw new ConflictError(`المسافة ${quote.distanceKm} كم أكبر من نطاق التوصيل (${quote.maxKm} كم)`, 'OUT_OF_RANGE', { distanceKm: quote.distanceKm });
    }
    const row = await this.db.transaction(async (tx) => {
      const [task] = await tx
        .insert(deliveryTasks)
        .values({
          cityId: city.id,
          type: input.type,
          requesterId: user.id,
          pickup: input.pickup,
          dropoff: input.dropoff,
          itemDescription: input.itemDescription,
          notes: input.notes ?? null,
          scheduledFor: input.scheduledFor ?? null,
          fee: quote?.fee ?? pricing.baseFee,
        })
        .returning();
      await this.outbox.record(tx, {
        type: 'delivery.requested',
        aggregateId: task!.id,
        payload: { cityId: city.id, requesterId: user.id },
      });
      return task!;
    });
    return toTask(row);
  }

  /** Creates the courier task for an accepted delivery order. Idempotent (unique order_id). */
  async createForOrder(orderId: string): Promise<void> {
    const [row] = await this.db
      .select({ order: orders, business: businesses })
      .from(orders)
      .innerJoin(businesses, eq(businesses.id, orders.businessId))
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!row || row.order.fulfillment !== 'delivery' || !row.order.address) return;
    const { order, business } = row;
    await this.db
      .insert(deliveryTasks)
      .values({
        cityId: order.cityId,
        type: 'merchant_to_citizen',
        orderId: order.id,
        requesterId: order.customerId,
        pickup: {
          text: business.address ?? business.name,
          ...(business.lat !== null && business.lng !== null && { location: { lat: business.lat, lng: business.lng } }),
          ...(business.phone && { contactPhone: business.phone }),
        },
        dropoff: order.address!,
        itemDescription: `طلب ${order.number} من ${business.name}`,
        fee: order.deliveryFee,
      })
      .onConflictDoNothing({ target: deliveryTasks.orderId });
  }

  async listMine(user: AuthUser, cursor: string | undefined, limit: number): Promise<Page<DeliveryTask>> {
    return this.page([eq(deliveryTasks.requesterId, user.id)], cursor, limit);
  }

  /** Open tasks in a city that any courier can claim. */
  async board(citySlug: string, cursor: string | undefined, limit: number): Promise<Page<DeliveryTask>> {
    const city = await this.cities.getBySlug(citySlug);
    return this.page([eq(deliveryTasks.cityId, city.id), eq(deliveryTasks.status, 'requested')], cursor, limit);
  }

  async assignedToMe(courier: AuthUser, cursor: string | undefined, limit: number): Promise<Page<DeliveryTask>> {
    return this.page([eq(deliveryTasks.courierId, courier.id)], cursor, limit);
  }

  /** Earnings statement and quality metrics for a courier (blueprint §18.1). */
  async courierStats(courier: AuthUser, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const [row] = await this.db
      .select({
        delivered: sql<number>`count(*) filter (where ${deliveryTasks.status} = 'delivered')::int`,
        failed: sql<number>`count(*) filter (where ${deliveryTasks.status} = 'failed')::int`,
        active: sql<number>`count(*) filter (where ${deliveryTasks.status} in ('assigned','picked_up'))::int`,
        earnings: sql<number>`coalesce(sum(${deliveryTasks.fee}) filter (where ${deliveryTasks.status} = 'delivered'), 0)::bigint`,
        avgMinutes: sql<number | null>`avg(extract(epoch from (${deliveryTasks.completedAt} - ${deliveryTasks.assignedAt})) / 60) filter (where ${deliveryTasks.status} = 'delivered')`,
      })
      .from(deliveryTasks)
      .where(and(eq(deliveryTasks.courierId, courier.id), gte(deliveryTasks.createdAt, since)));
    const delivered = row?.delivered ?? 0;
    const failed = row?.failed ?? 0;
    return {
      periodDays: days,
      delivered,
      failed,
      active: row?.active ?? 0,
      earnings: Number(row?.earnings ?? 0),
      averageMinutes: row?.avgMinutes !== null && row?.avgMinutes !== undefined ? Math.round(Number(row.avgMinutes)) : null,
      successRate: delivered + failed ? Math.round((delivered / (delivered + failed)) * 100) / 100 : null,
    };
  }

  /** Compare-and-set claim: two couriers can never get the same task. */
  async claim(courier: AuthUser, taskId: string): Promise<DeliveryTask> {
    const [row] = await this.db
      .update(deliveryTasks)
      .set({ courierId: courier.id, status: 'assigned', assignedAt: new Date() })
      .where(and(eq(deliveryTasks.id, taskId), eq(deliveryTasks.status, 'requested')))
      .returning();
    if (!row) throw new ConflictError('تم استلام المهمة من مندوب آخر أو لم تعد متاحة', 'TASK_TAKEN');
    return toTask(row);
  }

  async updateByCourier(courier: AuthUser, taskId: string, status: DeliveryStatus): Promise<DeliveryTask> {
    const rule = COURIER_TRANSITIONS[status];
    if (!rule) throw new ConflictError('حالة غير مسموحة للمندوب', 'INVALID_TRANSITION');

    const row = await this.db.transaction(async (tx) => {
      const [task] = await tx
        .update(deliveryTasks)
        .set({ status, ...(status !== 'picked_up' && { completedAt: new Date() }) })
        .where(and(eq(deliveryTasks.id, taskId), eq(deliveryTasks.courierId, courier.id), eq(deliveryTasks.status, rule.from)))
        .returning();
      if (!task) throw new ConflictError('لا يمكن تحديث هذه المهمة', 'INVALID_TRANSITION');
      if (task.orderId && rule.order) {
        await this.orders.transition(tx, task.orderId, rule.order, 'courier', courier.id);
      }
      return task;
    });
    return toTask(row);
  }

  async cancel(user: AuthUser, taskId: string): Promise<DeliveryTask> {
    const [task] = await this.db.select().from(deliveryTasks).where(eq(deliveryTasks.id, taskId)).limit(1);
    if (!task) throw new NotFoundError('مهمة التوصيل');
    if (task.requesterId !== user.id || task.orderId) throw new ForbiddenError();
    const [row] = await this.db
      .update(deliveryTasks)
      .set({ status: 'cancelled' })
      .where(and(eq(deliveryTasks.id, taskId), eq(deliveryTasks.status, 'requested')))
      .returning();
    if (!row) throw new ConflictError('لا يمكن إلغاء المهمة بعد استلامها', 'INVALID_TRANSITION');
    return toTask(row);
  }

  private async page(conditions: SQL[], cursor: string | undefined, limit: number): Promise<Page<DeliveryTask>> {
    const after = decodeCursor<[string]>(cursor, 1);
    if (after) conditions.push(lt(deliveryTasks.id, after[0]));
    const rows = await this.db
      .select()
      .from(deliveryTasks)
      .where(and(...conditions))
      .orderBy(desc(deliveryTasks.id))
      .limit(limit + 1);
    return toPage(rows, limit, toTask, (r) => [r.id]);
  }
}

function toTask(row: TaskRow): DeliveryTask {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    orderId: row.orderId,
    pickup: row.pickup,
    dropoff: row.dropoff,
    itemDescription: row.itemDescription,
    fee: row.fee,
    courierId: row.courierId,
    createdAt: row.createdAt.toISOString(),
  };
}
