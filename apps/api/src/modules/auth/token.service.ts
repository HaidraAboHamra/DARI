import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, PlatformRole } from '@dari/contracts';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import type { AccessTokenClaims } from '../../common/auth/auth-user';
import { UnauthorizedError } from '../../common/errors/app-error';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { sessions, users } from '../../infrastructure/database/schema';
import { toProfile } from '../users/users.service';

interface SessionContext {
  deviceName?: string | undefined;
  ip?: string | undefined;
}

/**
 * Short-lived stateless access tokens + long-lived opaque refresh tokens.
 * Refresh tokens are stored hashed and rotated on every use; replaying an
 * already-rotated token revokes the whole session (stolen token detection).
 */
@Injectable()
export class TokenService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
  ) {}

  async issue(user: typeof users.$inferSelect, ctx: SessionContext): Promise<AuthTokens> {
    const refreshToken = newRefreshToken();
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        deviceName: ctx.deviceName ?? null,
        ip: ctx.ip ?? null,
        expiresAt: this.refreshExpiry(),
      })
      .returning({ id: sessions.id });
    return this.tokens(user, session!.id, refreshToken);
  }

  async rotate(refreshToken: string, ctx: SessionContext): Promise<AuthTokens> {
    const presentedHash = sha256(refreshToken);
    const nextToken = newRefreshToken();

    const result = await this.db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.refreshTokenHash, presentedHash))
        .for('update')
        .limit(1);

      if (!session) return null;
      if (session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedError('انتهت الجلسة، سجّل الدخول من جديد');
      }

      await tx
        .update(sessions)
        .set({
          refreshTokenHash: sha256(nextToken),
          previousTokenHash: presentedHash,
          lastUsedAt: sql`now()`,
          expiresAt: this.refreshExpiry(),
          ip: ctx.ip ?? session.ip,
        })
        .where(eq(sessions.id, session.id));

      const [user] = await tx.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user) throw new UnauthorizedError();
      return this.tokens(user, session.id, nextToken);
    });

    if (!result) {
      // Unknown token: if it is an already-rotated one, someone replayed it.
      // Revoke in its own committed statement, then reject.
      await this.revokeOnReplay(presentedHash);
      throw new UnauthorizedError('الجلسة غير صالحة');
    }
    return result;
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      return this.jwt.verify<AccessTokenClaims>(token);
    } catch {
      throw new UnauthorizedError('رمز الدخول غير صالح أو منتهي');
    }
  }

  private async revokeOnReplay(hash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.previousTokenHash, hash), isNull(sessions.revokedAt)));
  }

  private tokens(user: typeof users.$inferSelect, sessionId: string, refreshToken: string): AuthTokens {
    const claims: AccessTokenClaims = { sub: user.id, role: user.role as PlatformRole, sid: sessionId };
    return {
      accessToken: this.jwt.sign(claims, { expiresIn: this.env.JWT_ACCESS_TTL_SECONDS }),
      refreshToken,
      expiresIn: this.env.JWT_ACCESS_TTL_SECONDS,
      user: toProfile(user),
    };
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  }
}

function newRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
