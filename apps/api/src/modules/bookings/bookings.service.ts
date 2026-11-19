import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVE_BOOKING_STATUSES,
  addDays,
  type BookableResource,
  type Booking,
  type BookingStatus,
  buildDaySlots,
  canChangeBooking,
  type CreateBookingInput,
  createBookingSchema,
  type CreateResourceInput,
  createResourceSchema,
  isValidSlot,
  type ListBookingsQuery,
  localDate,
  type Page,
  type Slot,
  type UpdateBookingStatusInput,
  type UpdateResourceInput,
  zonedTimeToUtc,
} from '@dari/contracts';
import { and, asc, desc, eq, gt, gte, inArray, lt, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { newReference } from '../../common/reference';
import { DB, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { bookableResources, bookings, businesses, users } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { BusinessesService } from '../directory/businesses.service';
import { PlansService } from '../directory/plans.service';
import { OutboxService } from '../platform/outbox.service';

type ResourceRow = typeof bookableResources.$inferSelect;

const CHECK_IN_TIME = '14:00';
const CHECK_OUT_TIME = '12:00';
const MAX_NIGHTS = 30;
const MAX_DAYS_AHEAD = 120;

/**
 * Unified booking engine (blueprint §10, §26): appointments, courts, rooms,
 * farms. Capacity is enforced under a per-resource advisory lock, so two
 * people can never take the last slot at the same time.
 */
@Injectable()
export class BookingsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly businesses: BusinessesService,
    private readonly access: BusinessAccessService,
    private readonly plans: PlansService,
    private readonly cities: CitiesService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Resources ────────────────────────────────────────────────────────────
  async listPublicResources(businessId: string): Promise<BookableResource[]> {
    await this.businesses.getActiveById(businessId);
    const rows = await this.db
      .select()
      .from(bookableResources)
      .where(and(eq(bookableResources.businessId, businessId), eq(bookableResources.isActive, true)))
      .orderBy(asc(bookableResources.name));
    return rows.map(toResource);
  }

  async listResources(user: AuthUser, businessId: string): Promise<BookableResource[]> {
    await this.access.require(user, businessId, 'bookings.manage');
    const rows = await this.db.select().from(bookableResources).where(eq(bookableResources.businessId, businessId)).orderBy(asc(bookableResources.name));
    return rows.map(toResource);
  }

  async createResource(user: AuthUser, businessId: string, input: CreateResourceInput): Promise<BookableResource> {
    await this.access.require(user, businessId, 'resources.write');
    await this.plans.assertCapacity(businessId, 'maxResources');
    const data = createResourceSchema.parse(input);
    const [row] = await this.db.insert(bookableResources).values({ ...data, businessId }).returning();
    return toResource(row!);
  }

  async updateResource(user: AuthUser, businessId: string, resourceId: string, input: UpdateResourceInput): Promise<BookableResource> {
    await this.access.require(user, businessId, 'resources.write');
    const [row] = await this.db
      .update(bookableResources)
      .set(input)
      .where(and(eq(bookableResources.id, resourceId), eq(bookableResources.businessId, businessId)))
      .returning();
    if (!row) throw new NotFoundError('المورد');
    return toResource(row);
  }

  // ── Availability ─────────────────────────────────────────────────────────
  async slots(resourceId: string, date: string): Promise<{ resource: BookableResource; slots: Slot[] }> {
    const { resource, timezone } = await this.loadBookable(resourceId);
    if (resource.unit !== 'slot') throw new ValidationError('هذا المورد يُحجز بالليالي');
    return { resource: toResource(resource), slots: await this.computeSlots(this.db, resource, date, timezone) };
  }

  async nights(resourceId: string, checkIn: string, checkOut: string) {
    const { resource, timezone } = await this.loadBookable(resourceId);
    if (resource.unit !== 'night') throw new ValidationError('هذا المورد يُحجز بالمواعيد');
    const window = this.nightWindow(checkIn, checkOut, timezone);
    const taken = await this.overlapping(this.db, resource.id, window.startsAt, window.endsAt);
    return {
      resource: toResource(resource),
      nights: window.nights,
      available: Math.max(0, resource.capacity - taken),
      total: resource.price * window.nights,
    };
  }

  // ── Booking ──────────────────────────────────────────────────────────────
  async book(user: AuthUser, input: CreateBookingInput): Promise<Booking> {
    const data = createBookingSchema.parse(input);
    const { resource, business, timezone } = await this.loadBookable(data.resourceId);

    const id = await this.db.transaction(async (tx) => {
      // Serialize bookings per resource: capacity checks below cannot race.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${resource.id}, 0))`);

      let startsAt: Date;
      let endsAt: Date;
      let total: number;
      if (resource.unit === 'slot') {
        if (!data.startsAt) throw new ValidationError('اختر موعداً');
        const slots = await this.computeSlots(tx, resource, localDate(data.startsAt, timezone), timezone);
        const slot = isValidSlot(slots, data.startsAt);
        if (!slot) throw new ValidationError('الموعد غير متاح ضمن أوقات العمل');
        if (slot.available < 1) throw new ConflictError('تم حجز هذا الموعد للتو، اختر موعداً آخر', 'SLOT_TAKEN');
        startsAt = new Date(slot.startsAt);
        endsAt = new Date(slot.endsAt);
        total = resource.price;
      } else {
        if (!data.checkIn || !data.checkOut) throw new ValidationError('حدد تاريخي الوصول والمغادرة');
        const window = this.nightWindow(data.checkIn, data.checkOut, timezone);
        if ((await this.overlapping(tx, resource.id, window.startsAt, window.endsAt)) >= resource.capacity) {
          throw new ConflictError('لا يوجد توفر في هذه التواريخ', 'SLOT_TAKEN');
        }
        ({ startsAt, endsAt } = window);
        total = resource.price * window.nights;
      }

      const status: BookingStatus = resource.autoConfirm ? 'confirmed' : 'pending';
      const [row] = await tx
        .insert(bookings)
        .values({
          number: newReference('B'),
          cityId: business.cityId,
          businessId: business.id,
          resourceId: resource.id,
          customerId: user.id,
          startsAt,
          endsAt,
          partySize: data.partySize,
          status,
          total,
          notes: data.notes ?? null,
        })
        .returning({ id: bookings.id, number: bookings.number });
      await this.outbox.record(tx, {
        type: 'booking.created',
        aggregateId: row!.id,
        payload: { businessId: business.id, customerId: user.id, number: row!.number, resourceName: resource.name, startsAt: startsAt.toISOString(), status },
      });
      return row!.id;
    });
    return this.get(user, id);
  }

  async get(user: AuthUser, id: string): Promise<Booking> {
    const [row] = await this.base(this.db).where(eq(bookings.id, id)).limit(1);
    if (!row) throw new NotFoundError('الحجز');
    if (row.booking.customerId !== user.id) await this.access.require(user, row.booking.businessId, 'bookings.manage');
    return toBooking(row);
  }

  async listMine(user: AuthUser, query: ListBookingsQuery): Promise<Page<Booking>> {
    return this.page([eq(bookings.customerId, user.id)], query);
  }

  async listForBusiness(user: AuthUser, businessId: string, query: ListBookingsQuery): Promise<Page<Booking>> {
    await this.access.require(user, businessId, 'bookings.manage');
    const conditions: SQL[] = [eq(bookings.businessId, businessId)];
    if (query.from) conditions.push(gte(bookings.startsAt, new Date(`${query.from}T00:00:00Z`)));
    return this.page(conditions, query);
  }

  async changeStatus(user: AuthUser, id: string, input: UpdateBookingStatusInput): Promise<Booking> {
    await this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookings).where(eq(bookings.id, id)).for('update').limit(1);
      if (!current) throw new NotFoundError('الحجز');
      const actor = current.customerId === user.id && input.status === 'cancelled' ? 'customer' : 'merchant';
      if (actor === 'merchant') {
        const role = await this.access.require(user, current.businessId, 'bookings.manage').catch(() => null);
        if (!role) throw new ForbiddenError();
      }
      if (!canChangeBooking(current.status, input.status, actor, current.startsAt)) {
        throw new ConflictError('لا يمكن تغيير حالة الحجز بهذا الشكل', 'INVALID_TRANSITION', { from: current.status, to: input.status });
      }
      await tx.update(bookings).set({ status: input.status }).where(eq(bookings.id, id));
      await this.outbox.record(tx, {
        type: 'booking.status_changed',
        aggregateId: id,
        payload: { businessId: current.businessId, customerId: current.customerId, number: current.number, from: current.status, to: input.status },
      });
    });
    return this.get(user, id);
  }

  // ── Internals ────────────────────────────────────────────────────────────
  private async loadBookable(resourceId: string) {
    const [resource] = await this.db.select().from(bookableResources).where(eq(bookableResources.id, resourceId)).limit(1);
    if (!resource || !resource.isActive) throw new NotFoundError('المورد');
    const business = await this.businesses.getActiveById(resource.businessId);
    const city = await this.cities.getById(business.cityId);
    return { resource, business, timezone: city.timezone };
  }

  private async computeSlots(db: DbExecutor, resource: ResourceRow, date: string, timezone: string): Promise<Slot[]> {
    const today = localDate(new Date(), timezone);
    if (date < today || date > addDays(today, MAX_DAYS_AHEAD)) return [];
    const dayStart = zonedTimeToUtc(date, '00:00', timezone);
    const dayEnd = new Date(dayStart.getTime() + 2 * 86_400_000); // include overnight windows
    const booked = await db
      .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resource.id),
          inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
          lt(bookings.startsAt, dayEnd),
          gt(bookings.endsAt, dayStart),
        ),
      );
    return buildDaySlots({ date, timeZone: timezone, weeklyHours: resource.weeklyHours, slotMinutes: resource.slotMinutes, capacity: resource.capacity, booked });
  }

  private nightWindow(checkIn: string, checkOut: string, timezone: string) {
    const today = localDate(new Date(), timezone);
    if (checkIn < today) throw new ValidationError('تاريخ الوصول في الماضي');
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
    if (nights < 1 || nights > MAX_NIGHTS) throw new ValidationError(`مدة الإقامة بين ليلة و${MAX_NIGHTS} ليلة`);
    return { nights, startsAt: zonedTimeToUtc(checkIn, CHECK_IN_TIME, timezone), endsAt: zonedTimeToUtc(checkOut, CHECK_OUT_TIME, timezone) };
  }

  private async overlapping(db: DbExecutor, resourceId: string, startsAt: Date, endsAt: Date): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resourceId),
          inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
          lt(bookings.startsAt, endsAt),
          gt(bookings.endsAt, startsAt),
        ),
      );
    return row?.n ?? 0;
  }

  private base(db: DbExecutor) {
    return db
      .select({ booking: bookings, businessName: businesses.name, resourceName: bookableResources.name, unit: bookableResources.unit, customerName: users.name })
      .from(bookings)
      .innerJoin(businesses, eq(businesses.id, bookings.businessId))
      .innerJoin(bookableResources, eq(bookableResources.id, bookings.resourceId))
      .innerJoin(users, eq(users.id, bookings.customerId));
  }

  private async page(conditions: SQL[], query: ListBookingsQuery): Promise<Page<Booking>> {
    if (query.status) conditions.push(eq(bookings.status, query.status));
    const after = decodeCursor<[string]>(query.cursor, 1);
    if (after) conditions.push(lt(bookings.id, after[0]));
    const rows = await this.base(this.db).where(and(...conditions)).orderBy(desc(bookings.id)).limit(query.limit + 1);
    return toPage(rows, query.limit, toBooking, (r) => [r.booking.id]);
  }
}

function toResource(r: ResourceRow): BookableResource {
  return {
    id: r.id,
    businessId: r.businessId,
    name: r.name,
    description: r.description,
    kind: r.kind,
    unit: r.unit,
    slotMinutes: r.slotMinutes,
    capacity: r.capacity,
    price: r.price,
    weeklyHours: r.weeklyHours,
    autoConfirm: r.autoConfirm,
    isActive: r.isActive,
  };
}

function toBooking(r: {
  booking: typeof bookings.$inferSelect;
  businessName: string;
  resourceName: string;
  unit: 'slot' | 'night';
  customerName: string | null;
}): Booking {
  const b = r.booking;
  return {
    id: b.id,
    number: b.number,
    businessId: b.businessId,
    businessName: r.businessName,
    resourceId: b.resourceId,
    resourceName: r.resourceName,
    unit: r.unit,
    customerId: b.customerId,
    customerName: r.customerName,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    partySize: b.partySize,
    status: b.status,
    total: b.total,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
  };
}
