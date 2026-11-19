
import { Inject, Injectable } from '@nestjs/common';
import {
  type BuyTicketsInput,
  type CityEvent,
  type CreateEventInput,
  createEventSchema,
  type ListEventsQuery,
  type Page,
  type Ticket,
} from '@dari/contracts';
import { and, asc, desc, eq, gt, gte, or, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { newReference } from '../../common/reference';
import { DB, DB_READ, type Database } from '../../infrastructure/database/database.module';
import { businesses, cityEvents, tickets, users } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { buildSearchText } from '../directory/search-text';
import { OutboxService } from '../platform/outbox.service';

type EventRow = { event: typeof cityEvents.$inferSelect; organizerName: string | null };

/** Events & trips with limited seats, digital tickets and door check-in (blueprint §5.9, §10). */
@Injectable()
export class EventsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly cities: CitiesService,
    private readonly access: BusinessAccessService,
    private readonly outbox: OutboxService,
  ) {}

  /** Upcoming published events, soonest first, keyset-paginated on (starts_at, id). */
  async list(query: ListEventsQuery): Promise<Page<CityEvent>> {
    const city = await this.cities.getBySlug(query.city);
    const conditions: SQL[] = [eq(cityEvents.cityId, city.id), eq(cityEvents.status, 'published'), gte(cityEvents.startsAt, sql`now() - interval '2 hours'`)];
    if (query.kind) conditions.push(eq(cityEvents.kind, query.kind));
    const after = decodeCursor<[string, string]>(query.cursor, 2);
    if (after) {
      const at = new Date(after[0]);
      conditions.push(or(gt(cityEvents.startsAt, at), and(eq(cityEvents.startsAt, at), gt(cityEvents.id, after[1])))!);
    }
    const rows = await this.base(this.read).where(and(...conditions)).orderBy(asc(cityEvents.startsAt), asc(cityEvents.id)).limit(query.limit + 1);
    return toPage(rows, query.limit, toEvent, (r) => [r.event.startsAt.toISOString(), r.event.id]);
  }

  async get(id: string): Promise<CityEvent> {
    const [row] = await this.base(this.read).where(and(eq(cityEvents.id, id), eq(cityEvents.status, 'published'))).limit(1);
    if (!row) throw new NotFoundError('الفعالية');
    return toEvent(row);
  }

  async create(user: AuthUser, input: CreateEventInput): Promise<CityEvent> {
    const data = createEventSchema.parse(input);
    const city = await this.cities.getBySlug(data.citySlug);
    if (data.businessId) await this.access.require(user, data.businessId, 'events.manage');
    const [row] = await this.db
      .insert(cityEvents)
      .values({
        cityId: city.id,
        organizerId: user.id,
        businessId: data.businessId ?? null,
        kind: data.kind,
        title: data.title,
        description: data.description,
        venue: data.venue,
        destination: data.destination ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt ?? null,
        capacity: data.capacity,
        price: data.price,
        coverUrl: data.coverUrl ?? null,
        status: data.status,
        searchText: buildSearchText(data.title, data.description, data.venue, data.destination),
      })
      .returning({ id: cityEvents.id });
    const [created] = await this.base(this.db).where(eq(cityEvents.id, row!.id));
    return toEvent(created!);
  }

  /** Atomic seat reservation: the conditional UPDATE is the single source of truth for capacity. */
  async buy(user: AuthUser, eventId: string, input: BuyTicketsInput): Promise<Ticket> {
    const ticketId = await this.db.transaction(async (tx) => {
      const [event] = await tx
        .update(cityEvents)
        .set({ seatsTaken: sql`${cityEvents.seatsTaken} + ${input.quantity}` })
        .where(
          and(
            eq(cityEvents.id, eventId),
            eq(cityEvents.status, 'published'),
            gt(cityEvents.startsAt, sql`now()`),
            sql`${cityEvents.seatsTaken} + ${input.quantity} <= ${cityEvents.capacity}`,
          ),
        )
        .returning();
      if (!event) {
        const [exists] = await tx.select({ left: sql<number>`${cityEvents.capacity} - ${cityEvents.seatsTaken}` }).from(cityEvents).where(eq(cityEvents.id, eventId));
        if (!exists) throw new NotFoundError('الفعالية');
        throw new ConflictError('لا توجد مقاعد كافية', 'SOLD_OUT', { seatsLeft: Math.max(0, Number(exists.left)) });
      }
      const [ticket] = await tx
        .insert(tickets)
        .values({ eventId, userId: user.id, code: newReference('T'), quantity: input.quantity, total: event.price * input.quantity })
        .returning({ id: tickets.id });
      await this.outbox.record(tx, { type: 'ticket.purchased', aggregateId: ticket!.id, payload: { eventId, organizerId: event.organizerId, title: event.title, quantity: input.quantity } });
      return ticket!.id;
    });
    return this.ticket(user.id, ticketId);
  }

  async myTickets(user: AuthUser): Promise<Ticket[]> {
    const rows = await this.ticketQuery().where(eq(tickets.userId, user.id)).orderBy(desc(tickets.id)).limit(100);
    return rows.map(toTicket);
  }

  async cancelTicket(user: AuthUser, ticketId: string): Promise<Ticket> {
    await this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .update(tickets)
        .set({ status: 'cancelled' })
        .where(and(eq(tickets.id, ticketId), eq(tickets.userId, user.id), eq(tickets.status, 'active')))
        .returning();
      if (!ticket) throw new ConflictError('لا يمكن إلغاء هذه التذكرة', 'INVALID_TRANSITION');
      const [event] = await tx
        .update(cityEvents)
        .set({ seatsTaken: sql`greatest(${cityEvents.seatsTaken} - ${ticket.quantity}, 0)` })
        .where(and(eq(cityEvents.id, ticket.eventId), gt(cityEvents.startsAt, sql`now()`)))
        .returning({ id: cityEvents.id });
      if (!event) throw new ConflictError('انتهى وقت الإلغاء', 'INVALID_TRANSITION');
    });
    return this.ticket(user.id, ticketId);
  }

  /** Door check-in by scanned code. Only the organizer (or the organizing business' staff). */
  async checkIn(user: AuthUser, eventId: string, code: string): Promise<Ticket & { holderName: string | null }> {
    await this.assertOrganizer(user, eventId);
    const [ticket] = await this.db
      .update(tickets)
      .set({ status: 'checked_in', checkedInAt: new Date() })
      .where(and(eq(tickets.eventId, eventId), eq(tickets.code, code), eq(tickets.status, 'active')))
      .returning();
    if (!ticket) {
      const [existing] = await this.db.select().from(tickets).where(and(eq(tickets.eventId, eventId), eq(tickets.code, code)));
      if (!existing) throw new NotFoundError('التذكرة');
      throw new ConflictError(existing.status === 'checked_in' ? 'تم استخدام هذه التذكرة مسبقاً' : 'التذكرة ملغاة', 'TICKET_USED');
    }
    const [row] = await this.ticketQuery().where(eq(tickets.id, ticket.id));
    const [holder] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, ticket.userId));
    return { ...toTicket(row!), holderName: holder?.name ?? null };
  }

  async attendees(user: AuthUser, eventId: string) {
    await this.assertOrganizer(user, eventId);
    const rows = await this.db
      .select({ code: tickets.code, quantity: tickets.quantity, status: tickets.status, name: users.name, checkedInAt: tickets.checkedInAt })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.userId))
      .where(eq(tickets.eventId, eventId))
      .orderBy(desc(tickets.id));
    return rows.map((r) => ({ ...r, checkedInAt: r.checkedInAt?.toISOString() ?? null }));
  }

  async organizedBy(user: AuthUser): Promise<CityEvent[]> {
    const rows = await this.base(this.read).where(eq(cityEvents.organizerId, user.id)).orderBy(desc(cityEvents.startsAt)).limit(50);
    return rows.map(toEvent);
  }

  private async assertOrganizer(user: AuthUser, eventId: string): Promise<void> {
    const [event] = await this.db.select().from(cityEvents).where(eq(cityEvents.id, eventId));
    if (!event) throw new NotFoundError('الفعالية');
    if (event.organizerId === user.id || user.role === 'admin') return;
    if (event.businessId) {
      await this.access.require(user, event.businessId, 'events.manage');
      return;
    }
    throw new ForbiddenError();
  }

  private async ticket(userId: string, ticketId: string): Promise<Ticket> {
    const [row] = await this.ticketQuery().where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)));
    if (!row) throw new NotFoundError('التذكرة');
    return toTicket(row);
  }

  private ticketQuery() {
    return this.db
      .select({ ticket: tickets, title: cityEvents.title, startsAt: cityEvents.startsAt, venue: cityEvents.venue })
      .from(tickets)
      .innerJoin(cityEvents, eq(cityEvents.id, tickets.eventId));
  }

  private base(db: Database) {
    return db
      .select({ event: cityEvents, organizerName: sql<string | null>`coalesce(${businesses.name}, ${users.name})` })
      .from(cityEvents)
      .leftJoin(businesses, eq(businesses.id, cityEvents.businessId))
      .innerJoin(users, eq(users.id, cityEvents.organizerId));
  }
}

export function toEvent({ event: e, organizerName }: EventRow): CityEvent {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    description: e.description,
    venue: e.venue,
    destination: e.destination,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    capacity: e.capacity,
    seatsLeft: Math.max(0, e.capacity - e.seatsTaken),
    price: e.price,
    coverUrl: e.coverUrl,
    organizerName,
    businessId: e.businessId,
    organizerId: e.organizerId,
  };
}

function toTicket(r: { ticket: typeof tickets.$inferSelect; title: string; startsAt: Date; venue: string }): Ticket {
  return {
    id: r.ticket.id,
    code: r.ticket.code,
    eventId: r.ticket.eventId,
    eventTitle: r.title,
    startsAt: r.startsAt.toISOString(),
    venue: r.venue,
    quantity: r.ticket.quantity,
    total: r.ticket.total,
    status: r.ticket.status,
    checkedInAt: r.ticket.checkedInAt?.toISOString() ?? null,
  };
}

