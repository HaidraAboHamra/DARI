import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '@dari/contracts';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../../common/auth/auth-user';
import { IS_PUBLIC, PLATFORM_ROLES_KEY } from '../../common/auth/decorators';
import { ForbiddenError, UnauthorizedError } from '../../common/errors/app-error';
import { TokenService } from './token.service';

/** Global guard: every route is private unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;

    const token = bearerToken(request);
    if (token) {
      try {
        const claims = this.tokens.verifyAccessToken(token);
        request.user = { id: claims.sub, role: claims.role, sessionId: claims.sid };
      } catch (err) {
        if (!isPublic) throw err;
      }
    }

    if (isPublic) return true;
    if (!request.user) throw new UnauthorizedError();

    const roles = this.reflector.getAllAndOverride<PlatformRole[] | undefined>(PLATFORM_ROLES_KEY, targets);
    if (roles && !roles.includes(request.user.role) && request.user.role !== 'admin') {
      throw new ForbiddenError();
    }
    return true;
  }
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}
