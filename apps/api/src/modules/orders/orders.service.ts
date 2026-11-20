import { Inject, Injectable } from '@nestjs/common';
import {
  canTransition,
  type CreateOrderInput,
  type ListOrdersQuery,
  type Order,
  type OrderActor,
  type OrderStatus,
  optionErrorMessage,
  type Page,
  priceLine,
  type UpdateOrderStatusInput,
  VERTICAL_META,
} from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import {
  customerRelationships,
  deliveryTasks,
  orderItems,
  orders,
  orderStatusHistory,
  products,
} from '../../infrastructure/database/schema';
import { CatalogService } from '../catalog/catalog.service';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { BusinessesService } from '../directory/businesses.service';
import { roleAllows } from '../directory/business-permissions';
import { MarketingService } from '../marketing/marketing.service';
import { OutboxService } from '../platform/outbox.service';
import { newReference } from '../../common/reference';
import { OrdersRepository } from './orders.repository';

const UNIQUE_VIOLATION = '23505';
const COMPLETED: ReadonlySet<OrderStatus> = new Set(['delivered', 'picked_up']);
const RELEASES_STOCK: ReadonlySet<OrderStatus> = new Set(['cancelled', 'rejected']);

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly repo: OrdersRepository,
    private readonly businesses: BusinessesService,
    private readonly access: BusinessAccessService,
    private readonly cities: CitiesService,
    private readonly catalog: CatalogService,
    private readonly outbox: OutboxService,
    private readonly marketing: MarketingService,
  ) {}

  /**
   * Places an order atomically: price snapshot, stock reservation, order rows and
   * the `order.created` event commit together or not at all. Safe to retry with
   * the same Idempotency-Key (mobile networks retry a lot).
   */
  async place(user: AuthUser, input: CreateOrderInput, idempotencyKey?: string): Promise<Order> {
    if (idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(user.id, idempotencyKey);
      if (existing) return existing;
    }

    const business = await this.businesses.getActiveById(input.businessId);
    if (!business.acceptsOrders) throw new ConflictError('هذا النشاط لا يستقبل الطلبات حالياً', 'ORDERS_DISABLED');
    const city = await this.cities.getById(business.cityId);
    if (!city.config.orderingVerticals.includes(business.vertical)) {
      throw new ConflictError(`الطلب غير متاح بعد لقطاع ${VERTICAL_META[business.vertical].labelAr}`, 'VERTICAL_DISABLED');
    }

    try {
      const orderId = await this.db.transaction(async (tx) => {
        const productIds = input.items.map((i) => i.productId);
        const rows = await tx
          .select()
          .from(products)
          .where(and(inArray(products.id, productIds), eq(products.businessId, business.id), isNull(products.deletedAt)));
        const byId = new Map(rows.map((p) => [p.id, p]));

        // Price every line from the current catalog (options included); never trust client prices.
        const lines = input.items.map((item) => {
          const product = byId.get(item.productId);
          if (!product || !product.isAvailable) {
            throw new ConflictError('أحد المنتجات لم يعد متوفراً', 'PRODUCT_UNAVAILABLE', { productId: item.productId });
          }
          const priced = priceLine(product.price, product.options, item.choices);
          if (!priced.ok) {
            throw new ConflictError(`${product.name}: ${optionErrorMessage(priced.error)}`, 'INVALID_OPTIONS', { productId: product.id });
          }
          return { item, product, unitPrice: priced.unitPrice, options: priced.options };
        });
        const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.item.quantity, 0);
        if (subtotal < business.minOrder) {
          throw new ConflictError(`الحد الأدنى للطلب من ${business.name} هو ${money(business.minOrder, city.currency)}`, 'BELOW_MIN_ORDER', { minOrder: business.minOrder });
        }
        // Stock is per product: reserve the total across lines that differ only by options.
        const perProduct = new Map<string, number>();
        for (const l of lines) perProduct.set(l.product.id, (perProduct.get(l.product.id) ?? 0) + l.item.quantity);
        for (const [productId, quantity] of perProduct) await this.reserveStock(tx, productId, quantity);

        const deliveryFee = input.fulfillment === 'delivery' ? business.deliveryFee : 0;
        const coupon = input.couponCode ? await this.marketing.redeem(tx, business.id, input.couponCode, subtotal) : null;
        const discount = coupon?.discount ?? 0;
        const [order] = await tx
          .insert(orders)
          .values({
            number: newReference('D'),
            cityId: business.cityId,
            businessId: business.id,
            customerId: user.id,
            fulfillment: input.fulfillment,
            subtotal,
            deliveryFee,
            discount,
            couponId: coupon?.couponId ?? null,
            total: subtotal - discount + deliveryFee,
            currency: city.currency,
            address: input.address ?? null,
            notes: input.notes ?? null,
            idempotencyKey: idempotencyKey ?? null,
          })
          .returning();

        await tx.insert(orderItems).values(
          lines.map((l) => ({
            orderId: order!.id,
            productId: l.product.id,
            name: l.product.name,
            unitPrice: l.unitPrice,
            quantity: l.item.quantity,
            options: l.options,
            note: l.item.note ?? null,
          })),
        );
        await tx.insert(orderStatusHistory).values({ orderId: order!.id, toStatus: 'pending', actorId: user.id });
        await this.outbox.record(tx, {
          type: 'order.created',
          aggregateId: order!.id,
          payload: { businessId: business.id, customerId: user.id, total: order!.total, number: order!.number },
        });
        return order!.id;
      });

      if (input.items.length) await this.catalog.invalidateMenu(business.id);
      return (await this.repo.findById(orderId))!;
    } catch (err) {
      if (idempotencyKey && isUniqueViolation(err)) {
        const existing = await this.repo.findByIdempotencyKey(user.id, idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async get(user: AuthUser, orderId: string): Promise<Order> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError('الطلب');
    if (order.customerId !== user.id) await this.access.require(user, order.businessId, 'orders.view');
    return order;
  }

  listMine(user: AuthUser, query: ListOrdersQuery): Promise<Page<Order>> {
    return this.repo.list({ customerId: user.id, status: query.status }, query.cursor, query.limit);
  }

  async listForBusiness(user: AuthUser, businessId: string, query: ListOrdersQuery): Promise<Page<Order>> {
    await this.access.require(user, businessId, 'orders.view');
    return this.repo.list({ businessId, status: query.status }, query.cursor, query.limit);
  }

  /** Status change requested over HTTP by a customer or a business member. */
  async changeStatus(user: AuthUser, orderId: string, input: UpdateOrderStatusInput): Promise<Order> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError('الطلب');
    const actor = await this.resolveActor(user, order, input.status);
    await this.db.transaction((tx) => this.transition(tx, orderId, input.status, actor, user.id, input.reason));
    return (await this.repo.findById(orderId))!;
  }

  /**
   * The only code path that mutates order status. Locks the row, validates the
   * transition against the shared state machine and emits the event.
   */
  async transition(
    tx: DbExecutor,
    orderId: string,
    to: OrderStatus,
    actor: OrderActor,
    actorId: string | null,
    reason?: string,
  ): Promise<void> {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!current) throw new NotFoundError('الطلب');
    if (current.status === to) return;
    if (!canTransition(current.status, to, actor, current.fulfillment)) {
      throw new ConflictError('لا يمكن تغيير حالة الطلب بهذا الشكل', 'INVALID_TRANSITION', { from: current.status, to });
    }

    await tx.update(orders).set({ status: to }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: current.status, toStatus: to, actorId, reason: reason ?? null });

    if (RELEASES_STOCK.has(to)) {
      await this.releaseStock(tx, orderId);
      if (current.couponId) await this.marketing.release(tx, current.couponId);
      await tx
        .update(deliveryTasks)
        .set({ status: 'cancelled' })
        .where(and(eq(deliveryTasks.orderId, orderId), eq(deliveryTasks.status, 'requested')));
    }
    if (COMPLETED.has(to)) await this.recordCustomerRelationship(tx, current);

    await this.outbox.record(tx, {
      type: 'order.status_changed',
      aggregateId: orderId,
      payload: { businessId: current.businessId, customerId: current.customerId, number: current.number, from: current.status, to },
    });
  }

  private async resolveActor(user: AuthUser, order: Order, to: OrderStatus): Promise<OrderActor> {
    if (order.customerId === user.id && to === 'cancelled') return 'customer';
    if (user.role === 'admin') return 'merchant';
    const role = await this.access.roleOf(user.id, order.businessId);
    if (!role) throw new ForbiddenError();
    const dispatchOnly = to === 'out_for_delivery' || to === 'delivered';
    if (roleAllows(role, 'orders.manage') || (dispatchOnly && roleAllows(role, 'orders.dispatch'))) return 'merchant';
    throw new ForbiddenError();
  }

  /** Atomic conditional decrement: no overselling even under concurrent checkouts. */
  private async reserveStock(tx: DbExecutor, productId: string, quantity: number): Promise<void> {
    const updated = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}` })
      .where(and(eq(products.id, productId), sql`${products.stock} is not null`, sql`${products.stock} >= ${quantity}`))
      .returning({ id: products.id });
    if (updated.length) return;

    const [tracked] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, productId));
    if (tracked?.stock !== null && tracked?.stock !== undefined) {
      throw new ConflictError('الكمية المطلوبة غير متوفرة', 'OUT_OF_STOCK', { productId, available: tracked.stock });
    }
  }

  private async releaseStock(tx: DbExecutor, orderId: string): Promise<void> {
    await tx.execute(sql`
      update ${products} p set stock = p.stock + i.quantity
      from ${orderItems} i
      where i.order_id = ${orderId} and i.product_id = p.id and p.stock is not null`);
  }

  private async recordCustomerRelationship(tx: DbExecutor, order: typeof orders.$inferSelect): Promise<void> {
    await tx
      .insert(customerRelationships)
      .values({
        businessId: order.businessId,
        userId: order.customerId,
        source: 'order',
        ordersCount: 1,
        totalSpent: order.total,
        lastOrderAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [customerRelationships.businessId, customerRelationships.userId],
        set: {
          ordersCount: sql`${customerRelationships.ordersCount} + 1`,
          totalSpent: sql`${customerRelationships.totalSpent} + ${order.total}`,
          lastOrderAt: sql`now()`,
        },
      });
  }
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
}

