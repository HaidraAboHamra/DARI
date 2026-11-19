import { Injectable } from '@nestjs/common';
import { VERTICAL_META } from '@dari/contracts';
import { and, eq, inArray } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DB, type Database } from '../infrastructure/database/database.module';
import { businesses, businessMembers, users } from '../infrastructure/database/schema';
import type { DomainEvent, DomainEventType, EventOf } from '../modules/platform/domain-events';
import { DeliveryService } from '../modules/delivery/delivery.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

const ORDER_STATUS_AR: Record<string, string> = {
  accepted: 'تم قبول طلبك',
  preparing: 'طلبك قيد التحضير',
  ready: 'طلبك جاهز',
  out_for_delivery: 'طلبك في الطريق إليك',
  delivered: 'تم توصيل طلبك',
  picked_up: 'تم استلام طلبك',
  rejected: 'تم رفض طلبك',
  cancelled: 'تم إلغاء الطلب',
};

type Handlers = { [T in DomainEventType]: (event: EventOf<T>) => Promise<void> };

/**
 * Reactions to domain events. Each handler must be idempotent: the relay
 * guarantees at-least-once delivery.
 */
@Injectable()
export class OutboxHandlers {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
    private readonly delivery: DeliveryService,
  ) {}

  private readonly handlers: Handlers = {
    'order.created': async (e) => {
      const staff = await this.staffOf(e.payload.businessId, ['owner', 'manager', 'cashier']);
      await this.notifications.notify(
        staff.map((userId) => ({
          userId,
          type: 'order.created',
          title: `طلب جديد ${e.payload.number}`,
          body: `قيمة الطلب ${e.payload.total.toLocaleString('ar-SY')}`,
          data: { orderId: e.aggregateId, businessId: e.payload.businessId },
        })),
      );
    },
    'order.status_changed': async (e) => {
      if (e.payload.to === 'accepted') await this.delivery.createForOrder(e.aggregateId);
      const title = ORDER_STATUS_AR[e.payload.to];
      if (!title) return;
      await this.notifications.notify([
        { userId: e.payload.customerId, type: 'order.status', title, body: `الطلب ${e.payload.number}`, data: { orderId: e.aggregateId } },
      ]);
    },
    'delivery.requested': async () => {
      // Dispatch is pull-based (courier board); a push-to-couriers channel plugs in here.
    },
    'business.submitted': async (e) => {
      const admins = await this.db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
      await this.notifications.notify(
        admins.map((a) => ({
          userId: a.id,
          type: 'business.submitted',
          title: 'نشاط تجاري بانتظار المراجعة',
          body: e.payload.name,
          data: { businessId: e.aggregateId },
        })),
      );
    },
    'business.approved': async (e) => {
      const [business] = await this.db.select({ vertical: businesses.vertical }).from(businesses).where(eq(businesses.id, e.aggregateId));
      await this.notifications.notify(
        e.payload.ownerIds.map((userId) => ({
          userId,
          type: 'business.approved',
          title: 'تم تفعيل نشاطك على داري 🎉',
          body: `${e.payload.name} ظاهر الآن في ${business ? VERTICAL_META[business.vertical].labelAr : 'الدليل'}`,
          data: { businessId: e.aggregateId },
        })),
      );
    },
    'job.applied': async (e) => {
      await this.notifications.notify([
        { userId: e.payload.postedById, type: 'job.applied', title: 'متقدم جديد', body: e.payload.title, data: { jobId: e.payload.jobId } },
      ]);
    },
  };

  handle(event: DomainEvent): Promise<void> {
    const handler = this.handlers[event.type] as (e: DomainEvent) => Promise<void>;
    return handler(event);
  }

  private async staffOf(businessId: string, roles: ('owner' | 'manager' | 'cashier')[]): Promise<string[]> {
    const rows = await this.db
      .select({ userId: businessMembers.userId })
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), inArray(businessMembers.role, roles)));
    return rows.map((r) => r.userId);
  }
}
