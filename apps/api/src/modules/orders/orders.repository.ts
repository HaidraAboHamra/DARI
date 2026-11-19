import { Inject, Injectable } from '@nestjs/common';
import type { Order, OrderStatus, Page } from '@dari/contracts';
import { and, desc, eq, inArray, lt, type SQL } from 'drizzle-orm';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { businesses, orderItems, orders, users } from '../../infrastructure/database/schema';

type OrderRow = {
  order: typeof orders.$inferSelect;
  businessName: string;
  customerName: string | null;
};

/** Read model for orders. Items are loaded in one query per page (no N+1). */
@Injectable()
export class OrdersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string, db: DbExecutor = this.db): Promise<Order | null> {
    const rows = await this.base(db).where(eq(orders.id, id)).limit(1);
    const [order] = await this.hydrate(rows, db);
    return order ?? null;
  }

  async findByIdempotencyKey(customerId: string, key: string, db: DbExecutor = this.db): Promise<Order | null> {
    const rows = await this.base(db)
      .where(and(eq(orders.customerId, customerId), eq(orders.idempotencyKey, key)))
      .limit(1);
    const [order] = await this.hydrate(rows, db);
    return order ?? null;
  }

  async list(
    filter: { customerId?: string; businessId?: string; status?: OrderStatus | undefined },
    cursor: string | undefined,
    limit: number,
  ): Promise<Page<Order>> {
    const conditions: SQL[] = [];
    if (filter.customerId) conditions.push(eq(orders.customerId, filter.customerId));
    if (filter.businessId) conditions.push(eq(orders.businessId, filter.businessId));
    if (filter.status) conditions.push(eq(orders.status, filter.status));
    const after = decodeCursor<[string]>(cursor, 1);
    if (after) conditions.push(lt(orders.id, after[0]));

    const rows = await this.base(this.db)
      .where(and(...conditions))
      .orderBy(desc(orders.id))
      .limit(limit + 1);
    const page = toPage(rows, limit, (r) => r, (r) => [r.order.id]);
    return { items: await this.hydrate(page.items, this.db), nextCursor: page.nextCursor };
  }

  private base(db: DbExecutor) {
    return db
      .select({ order: orders, businessName: businesses.name, customerName: users.name })
      .from(orders)
      .innerJoin(businesses, eq(businesses.id, orders.businessId))
      .innerJoin(users, eq(users.id, orders.customerId));
  }

  private async hydrate(rows: OrderRow[], db: DbExecutor): Promise<Order[]> {
    if (!rows.length) return [];
    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, rows.map((r) => r.order.id)));
    const byOrder = Map.groupBy(items, (i) => i.orderId);
    return rows.map(({ order: o, businessName, customerName }) => ({
      id: o.id,
      number: o.number,
      businessId: o.businessId,
      businessName,
      customerId: o.customerId,
      customerName,
      status: o.status,
      fulfillment: o.fulfillment,
      items: (byOrder.get(o.id) ?? []).map((i) => ({
        productId: i.productId,
        name: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.unitPrice * i.quantity,
      })),
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      currency: o.currency,
      address: o.address,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }
}
