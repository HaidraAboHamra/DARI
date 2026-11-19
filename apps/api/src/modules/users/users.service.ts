import { Inject, Injectable } from '@nestjs/common';
import type { UpdateProfileInput, UserProfile } from '@dari/contracts';
import { eq, sql } from 'drizzle-orm';
import { NotFoundError } from '../../common/errors/app-error';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { users } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';

type UserRow = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cities: CitiesService,
  ) {}

  /** Phone is the identity: first successful OTP creates the account (idempotent under races). */
  async findOrCreateByPhone(phone: string): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({ phone, phoneVerifiedAt: new Date() })
      .onConflictDoUpdate({ target: users.phone, set: { lastSeenAt: sql`now()` } })
      .returning();
    return row!;
  }

  async findById(id: string): Promise<UserRow> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) throw new NotFoundError('المستخدم');
    return row;
  }

  async findByPhone(phone: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return row ?? null;
  }

  async getProfile(id: string): Promise<UserProfile> {
    return toProfile(await this.findById(id));
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfile> {
    const cityId = input.citySlug ? (await this.cities.getBySlug(input.citySlug)).id : undefined;
    const [row] = await this.db
      .update(users)
      .set({ ...(input.name !== undefined && { name: input.name }), ...(cityId && { cityId }) })
      .where(eq(users.id, id))
      .returning();
    if (!row) throw new NotFoundError('المستخدم');
    return toProfile(row);
  }
}

export function toProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    cityId: row.cityId,
    createdAt: row.createdAt.toISOString(),
  };
}
