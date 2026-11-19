import { Inject, Injectable } from '@nestjs/common';
import type { CreateReviewInput, Page, Review } from '@dari/contracts';
import { and, desc, eq, lt, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ForbiddenError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, DB_READ, type Database } from '../../infrastructure/database/database.module';
import { businesses, businessMembers, reviews, users } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { BusinessesService } from '../directory/businesses.service';

/**
 * Detailed reviews (quality, commitment, interaction — blueprint §9).
 * One review per user per business; editing replaces it. Members cannot review
 * their own business (basic anti-manipulation, blueprint §16.3).
 */
@Injectable()
export class ReviewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly businesses: BusinessesService,
    private readonly cache: CacheService,
  ) {}

  async list(businessId: string, cursor: string | undefined, limit: number): Promise<Page<Review>> {
    const conditions: SQL[] = [eq(reviews.businessId, businessId)];
    const after = decodeCursor<[string]>(cursor, 1);
    if (after) conditions.push(lt(reviews.id, after[0]));
    const rows = await this.read
      .select({ review: reviews, authorName: users.name })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(and(...conditions))
      .orderBy(desc(reviews.id))
      .limit(limit + 1);
    return toPage(
      rows,
      limit,
      ({ review: r, authorName }) => ({
        id: r.id,
        rating: r.rating,
        quality: r.quality,
        commitment: r.commitment,
        interaction: r.interaction,
        body: r.body,
        authorName: authorName ? maskName(authorName) : null,
        createdAt: r.createdAt.toISOString(),
      }),
      (r) => [r.review.id],
    );
  }

  async upsert(user: AuthUser, businessId: string, input: CreateReviewInput): Promise<void> {
    const business = await this.businesses.getActiveById(businessId);
    const [member] = await this.db
      .select({ role: businessMembers.role })
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, user.id)));
    if (member) throw new ForbiddenError('لا يمكنك تقييم نشاطك التجاري');

    const values = {
      rating: input.rating,
      quality: input.quality ?? null,
      commitment: input.commitment ?? null,
      interaction: input.interaction ?? null,
      body: input.body ?? null,
    };
    await this.db.transaction(async (tx) => {
      await tx
        .insert(reviews)
        .values({ businessId, userId: user.id, ...values })
        .onConflictDoUpdate({ target: [reviews.businessId, reviews.userId], set: values });
      await tx
        .update(businesses)
        .set({
          ratingAvg: sql`(select coalesce(avg(rating), 0) from ${reviews} where business_id = ${businessId})`,
          ratingCount: sql`(select count(*) from ${reviews} where business_id = ${businessId})`,
        })
        .where(eq(businesses.id, businessId));
    });
    await this.cache.invalidate(`business:page:${business.slug}`);
  }
}

/** Privacy: show "أحمد م." instead of a full name. */
function maskName(name: string): string {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first!;
}
