import { Injectable } from '@nestjs/common';
import { VERTICAL_META } from '@dari/contracts';
import { Inject } from '@nestjs/common';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { DB, type Database } from '../infrastructure/database/database.module';
import { businesses, businessMembers, customerRelationships, notifications, users } from '../infrastructure/database/schema';
import type { DomainEvent, DomainEventType, EventOf } from '../modules/platform/domain-events';
import { DeliveryService } from '../modules/delivery/delivery.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

const BOOKING_STATUS_AR: Record<string, string> = {
  confirmed: 'تم تأكيد حجزك',
  rejected: 'تعذّر قبول حجزك',
  cancelled: 'تم إلغاء الحجز',
  completed: 'شكراً لزيارتك',
  no_show: 'سُجّل الحجز كعدم حضور',
};

const SERVICE_STATUS_AR: Record<string, string> = {
  assigned: 'تم تعيين مقدم الخدمة',
  on_the_way: 'مقدم الخدمة في الطريق',
  arrived: 'وصل مقدم الخدمة',
  completed: 'اكتملت الخدمة — قيّم التجربة',
  cancelled: 'تم إلغاء طلب الخدمة',
};

const STAFF = ['owner', 'manager', 'cashier'] as const;
/** Upper bound on providers pinged per request: avoids spam and keeps fan-out O(1). */
const MAX_PROVIDERS_NOTIFIED = 50;

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
      if (e.payload.to === 'accepted') {
        await this.delivery.createForOrder(e.aggregateId);
        await this.pingCouriers();
      }
      const title = ORDER_STATUS_AR[e.payload.to];
      if (!title) return;
      await this.notifications.notify([
        { userId: e.payload.customerId, type: 'order.status', title, body: `الطلب ${e.payload.number}`, data: { orderId: e.aggregateId } },
      ]);
    },
    'delivery.requested': async () => {
      // Dispatch stays pull-based (first courier to claim wins); this just wakes the boards up.
      await this.pingCouriers();
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
    'booking.created': async (e) => {
      const staff = await this.staffOf(e.payload.businessId, [...STAFF]);
      const when = new Date(e.payload.startsAt).toLocaleString('ar-SY', { timeZone: 'Asia/Damascus', dateStyle: 'medium', timeStyle: 'short' });
      await this.notifications.notify([
        ...staff.map((userId) => ({
          userId,
          type: 'booking.created',
          title: `حجز جديد ${e.payload.number}`,
          body: `${e.payload.resourceName} · ${when}`,
          data: { bookingId: e.aggregateId, businessId: e.payload.businessId },
        })),
        ...(e.payload.status === 'confirmed'
          ? [{ userId: e.payload.customerId, type: 'booking.status', title: 'تم تأكيد حجزك', body: `${e.payload.resourceName} · ${when}`, data: { bookingId: e.aggregateId } }]
          : []),
      ]);
    },
    'booking.status_changed': async (e) => {
      const title = BOOKING_STATUS_AR[e.payload.to];
      if (!title) return;
      await this.notifications.notify([{ userId: e.payload.customerId, type: 'booking.status', title, body: `الحجز ${e.payload.number}`, data: { bookingId: e.aggregateId } }]);
    },
    'service.requested': async (e) => {
      const providers = await this.db
        .select({ id: businesses.id })
        .from(businesses)
        .where(
          e.payload.targetBusinessId
            ? eq(businesses.id, e.payload.targetBusinessId)
            : and(eq(businesses.cityId, e.payload.cityId), eq(businesses.categoryId, e.payload.categoryId), eq(businesses.status, 'active')),
        )
        .limit(MAX_PROVIDERS_NOTIFIED);
      if (!providers.length) return;
      const staff = await this.db
        .selectDistinct({ userId: businessMembers.userId })
        .from(businessMembers)
        .where(and(inArray(businessMembers.businessId, providers.map((p) => p.id)), inArray(businessMembers.role, ['owner', 'manager'])));
      await this.notifications.notify(
        staff.map((s) => ({ userId: s.userId, type: 'service.requested', title: 'طلب خدمة جديد قريب منك', body: `الطلب ${e.payload.number}`, data: { requestId: e.aggregateId } })),
      );
    },
    'service.quoted': async (e) => {
      await this.notifications.notify([
        { userId: e.payload.customerId, type: 'service.quoted', title: 'وصلك عرض سعر', body: `${e.payload.businessName} · ${e.payload.number}`, data: { requestId: e.aggregateId } },
      ]);
    },
    'service.status_changed': async (e) => {
      const title = SERVICE_STATUS_AR[e.payload.to];
      if (title) {
        await this.notifications.notify([{ userId: e.payload.customerId, type: 'service.status', title, body: `الطلب ${e.payload.number}`, data: { requestId: e.aggregateId } }]);
      }
      if (e.payload.to === 'cancelled' && e.payload.providerBusinessId) {
        const staff = await this.staffOf(e.payload.providerBusinessId, ['owner', 'manager']);
        await this.notifications.notify(staff.map((userId) => ({ userId, type: 'service.status', title: 'ألغى الزبون الطلب', body: e.payload.number, data: { requestId: e.aggregateId } })));
      }
    },
    'ticket.purchased': async (e) => {
      await this.notifications.notify([
        { userId: e.payload.organizerId, type: 'ticket.purchased', title: `حجز ${e.payload.quantity} مقعد`, body: e.payload.title, data: { eventId: e.payload.eventId } },
      ]);
    },
    'listing.lead': async (e) => {
      await this.notifications.notify([
        { userId: e.payload.ownerId, type: 'listing.lead', title: 'طلب معاينة جديد', body: e.payload.title, data: { listingId: e.payload.listingId } },
      ]);
    },
    'broadcast.created': async (e) => {
      // Set-based fan-out inside the database: scales to large audiences without loading them in memory.
      await this.db.execute(sql`
        insert into ${notifications} (id, user_id, type, title, body, data, created_at)
        select uuid_generate_v7(), ${customerRelationships.userId}, 'broadcast', ${`${e.payload.businessName}: ${e.payload.title}`}, ${e.payload.body},
               ${JSON.stringify({ businessId: e.payload.businessId })}::jsonb, now()
        from ${customerRelationships}
        where ${and(eq(customerRelationships.businessId, e.payload.businessId), isNotNull(customerRelationships.consentedAt), isNull(customerRelationships.revokedAt))}`);
    },
  };

  handle(event: DomainEvent): Promise<void> {
    const handler = this.handlers[event.type] as (e: DomainEvent) => Promise<void>;
    return handler(event);
  }

  private async pingCouriers(): Promise<void> {
    const couriers = await this.db.select({ id: users.id }).from(users).where(eq(users.role, 'courier'));
    await this.notifications.ping(couriers.map((c) => c.id), 'delivery.available');
  }

  private async staffOf(businessId: string, roles: ('owner' | 'manager' | 'cashier')[]): Promise<string[]> {
    if (!roles.length) return [];
    const rows = await this.db
      .select({ userId: businessMembers.userId })
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), inArray(businessMembers.role, roles)));
    return rows.map((r) => r.userId);
  }
}
