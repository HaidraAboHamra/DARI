import { Inject, Injectable } from '@nestjs/common';
import {
  type CreateListingInput,
  createListingSchema,
  type LeadStatus,
  type ListListingsQuery,
  type Page,
  type PropertyListing,
  type UpdateListingInput,
  type ViewingLead,
  type ViewingRequestInput,
} from '@dari/contracts';
import { and, desc, eq, gte, inArray, lt, lte, or, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, DB_READ, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, propertyListings, users, viewingRequests } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { buildSearchText } from '../directory/search-text';
import { OutboxService } from '../platform/outbox.service';

export type ListingRow = { listing: typeof propertyListings.$inferSelect; areaName: string | null; officeName: string | null };

const columns = { listing: propertyListings, areaName: areas.nameAr, officeName: businesses.name };
const featuredRank = sql<number>`(case when ${propertyListings.featuredUntil} > now() then 1 else 0 end)`;

/** Real estate (blueprint §12.2): listings, filters, viewing requests as leads. */
@Injectable()
export class PropertyService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly cities: CitiesService,
    private readonly access: BusinessAccessService,
    private readonly outbox: OutboxService,
  ) {}

  /** Featured listings first, then newest; keyset on (featured, id). */
  async list(query: ListListingsQuery): Promise<Page<PropertyListing>> {
    const city = await this.cities.getBySlug(query.city);
    const c: SQL[] = [eq(propertyListings.cityId, city.id), eq(propertyListings.status, 'active')];
    if (query.purpose) c.push(eq(propertyListings.purpose, query.purpose));
    if (query.propertyType) c.push(eq(propertyListings.propertyType, query.propertyType));
    if (query.areaId) c.push(eq(propertyListings.areaId, query.areaId));
    if (query.minPrice !== undefined) c.push(gte(propertyListings.price, query.minPrice));
    if (query.maxPrice !== undefined) c.push(lte(propertyListings.price, query.maxPrice));
    if (query.minRooms !== undefined) c.push(gte(propertyListings.rooms, query.minRooms));
    const after = decodeCursor<[number, string]>(query.cursor, 2);
    if (after) c.push(or(lt(featuredRank, after[0]), and(sql`${featuredRank} = ${after[0]}`, lt(propertyListings.id, after[1])))!);

    const rows = await this.read
      .select({ ...columns, featured: featuredRank })
      .from(propertyListings)
      .leftJoin(areas, eq(areas.id, propertyListings.areaId))
      .leftJoin(businesses, eq(businesses.id, propertyListings.businessId))
      .where(and(...c))
      .orderBy(desc(featuredRank), desc(propertyListings.id))
      .limit(query.limit + 1);
    return toPage(rows, query.limit, toListing, (r) => [r.featured, r.listing.id]);
  }

  async get(id: string, viewer: AuthUser | null): Promise<PropertyListing> {
    const [row] = await this.query(this.read).where(eq(propertyListings.id, id)).limit(1);
    if (!row) throw new NotFoundError('العقار');
    if (row.listing.status !== 'active' && row.listing.ownerId !== viewer?.id && viewer?.role !== 'admin') throw new NotFoundError('العقار');
    return toListing(row);
  }

  async create(user: AuthUser, input: CreateListingInput): Promise<PropertyListing> {
    const data = createListingSchema.parse(input);
    const city = await this.cities.getBySlug(data.citySlug);
    if (data.businessId) await this.access.require(user, data.businessId, 'listings.write');
    const areaName = data.areaId ? (await this.db.select({ n: areas.nameAr }).from(areas).where(eq(areas.id, data.areaId)))[0]?.n : undefined;
    const [row] = await this.db
      .insert(propertyListings)
      .values({
        cityId: city.id,
        ownerId: user.id,
        businessId: data.businessId ?? null,
        purpose: data.purpose,
        propertyType: data.propertyType,
        title: data.title,
        description: data.description,
        price: data.price,
        areaId: data.areaId ?? null,
        rooms: data.rooms ?? null,
        sizeSqm: data.sizeSqm ?? null,
        address: data.address ?? null,
        lat: data.location?.lat ?? null,
        lng: data.location?.lng ?? null,
        images: data.images,
        searchText: buildSearchText(data.title, data.description, areaName),
      })
      .returning({ id: propertyListings.id });
    return this.get(row!.id, user);
  }

  async update(user: AuthUser, id: string, input: UpdateListingInput): Promise<PropertyListing> {
    const listing = await this.owned(user, id);
    const next = { ...listing, ...input };
    await this.db
      .update(propertyListings)
      .set({ ...input, searchText: buildSearchText(next.title, next.description) })
      .where(eq(propertyListings.id, id));
    return this.get(id, user);
  }

  async mine(user: AuthUser): Promise<PropertyListing[]> {
    const rows = await this.query(this.db).where(eq(propertyListings.ownerId, user.id)).orderBy(desc(propertyListings.id)).limit(100);
    return rows.map(toListing);
  }

  async requestViewing(user: AuthUser, listingId: string, input: ViewingRequestInput): Promise<ViewingLead> {
    const listing = await this.get(listingId, user);
    if (listing.ownerId === user.id) throw new ForbiddenError('هذا إعلانك');
    const [requester] = await this.db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id));
    const id = await this.db.transaction(async (tx) => {
      const [open] = await tx
        .select({ id: viewingRequests.id })
        .from(viewingRequests)
        .where(and(eq(viewingRequests.listingId, listingId), eq(viewingRequests.requesterId, user.id), eq(viewingRequests.status, 'new')));
      if (open) throw new ConflictError('أرسلت طلب معاينة لهذا العقار، سيتواصل معك المعلن', 'ALREADY_REQUESTED');
      const [row] = await tx
        .insert(viewingRequests)
        .values({ listingId, requesterId: user.id, phone: input.phone ?? requester!.phone, message: input.message ?? null, preferredTime: input.preferredTime ?? null })
        .returning({ id: viewingRequests.id });
      await this.outbox.record(tx, { type: 'listing.lead', aggregateId: row!.id, payload: { listingId, ownerId: listing.ownerId, title: listing.title } });
      return row!.id;
    });
    const [lead] = await this.leadsQuery(this.db).where(eq(viewingRequests.id, id));
    return toLead(lead!);
  }

  /** Lead CRM for owners and offices: every viewing request on my listings. */
  async myLeads(user: AuthUser): Promise<ViewingLead[]> {
    const rows = await this.leadsQuery(this.db).where(eq(propertyListings.ownerId, user.id)).orderBy(desc(viewingRequests.id)).limit(200);
    return rows.map(toLead);
  }

  async setLeadStatus(user: AuthUser, leadId: string, status: LeadStatus): Promise<void> {
    const [lead] = await this.db
      .select({ ownerId: propertyListings.ownerId })
      .from(viewingRequests)
      .innerJoin(propertyListings, eq(propertyListings.id, viewingRequests.listingId))
      .where(eq(viewingRequests.id, leadId));
    if (!lead) throw new NotFoundError('الطلب');
    if (lead.ownerId !== user.id) throw new ForbiddenError();
    await this.db.update(viewingRequests).set({ status }).where(eq(viewingRequests.id, leadId));
  }

  async findByIds(ids: string[]): Promise<PropertyListing[]> {
    if (!ids.length) return [];
    const rows = await this.query(this.read).where(inArray(propertyListings.id, ids));
    return rows.map(toListing);
  }

  private async owned(user: AuthUser, id: string) {
    const [listing] = await this.db.select().from(propertyListings).where(eq(propertyListings.id, id));
    if (!listing) throw new NotFoundError('العقار');
    if (listing.ownerId === user.id || user.role === 'admin') return listing;
    if (listing.businessId) {
      await this.access.require(user, listing.businessId, 'listings.write');
      return listing;
    }
    throw new ForbiddenError();
  }

  private query(db: DbExecutor) {
    return db
      .select(columns)
      .from(propertyListings)
      .leftJoin(areas, eq(areas.id, propertyListings.areaId))
      .leftJoin(businesses, eq(businesses.id, propertyListings.businessId));
  }

  private leadsQuery(db: DbExecutor) {
    return db
      .select({ lead: viewingRequests, listingTitle: propertyListings.title, name: users.name })
      .from(viewingRequests)
      .innerJoin(propertyListings, eq(propertyListings.id, viewingRequests.listingId))
      .innerJoin(users, eq(users.id, viewingRequests.requesterId));
  }
}


export function toListing({ listing: l, areaName, officeName }: ListingRow): PropertyListing {
  return {
    id: l.id,
    purpose: l.purpose,
    propertyType: l.propertyType,
    title: l.title,
    description: l.description,
    price: l.price,
    areaName,
    rooms: l.rooms,
    sizeSqm: l.sizeSqm,
    address: l.address,
    location: l.lat !== null && l.lng !== null ? { lat: l.lat, lng: l.lng } : null,
    images: l.images,
    status: l.status,
    isFeatured: l.featuredUntil !== null && l.featuredUntil > new Date(),
    ownerId: l.ownerId,
    officeName,
    createdAt: l.createdAt.toISOString(),
  };
}

function toLead(r: { lead: typeof viewingRequests.$inferSelect; listingTitle: string; name: string | null }): ViewingLead {
  return {
    id: r.lead.id,
    listingId: r.lead.listingId,
    listingTitle: r.listingTitle,
    name: r.name,
    phone: r.lead.phone,
    message: r.lead.message,
    preferredTime: r.lead.preferredTime,
    status: r.lead.status,
    createdAt: r.lead.createdAt.toISOString(),
  };
}
