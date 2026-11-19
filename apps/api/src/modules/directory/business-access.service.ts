import { Inject, Injectable } from '@nestjs/common';
import type { BusinessRole } from '@dari/contracts';
import { and, eq } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ForbiddenError } from '../../common/errors/app-error';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { businessMembers } from '../../infrastructure/database/schema';
import { type BusinessPermission, roleAllows } from './business-permissions';

/** Authorizes actions on a business ("access by business/branch", blueprint §16.2). */
@Injectable()
export class BusinessAccessService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async roleOf(userId: string, businessId: string): Promise<BusinessRole | null> {
    const [row] = await this.db
      .select({ role: businessMembers.role })
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)))
      .limit(1);
    return row?.role ?? null;
  }

  /** Returns the caller's role, or throws if it lacks the permission. Platform admins pass. */
  async require(user: AuthUser, businessId: string, permission: BusinessPermission): Promise<BusinessRole | 'admin'> {
    if (user.role === 'admin') return 'admin';
    const role = await this.roleOf(user.id, businessId);
    if (!role || !roleAllows(role, permission)) throw new ForbiddenError();
    return role;
  }
}
