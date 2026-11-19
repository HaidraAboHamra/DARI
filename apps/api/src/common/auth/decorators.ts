import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '@dari/contracts';
import type { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors/app-error';
import type { AuthUser } from './auth-user';

export const IS_PUBLIC = 'auth:isPublic';
export const PLATFORM_ROLES_KEY = 'auth:platformRoles';

type RequestWithUser = FastifyRequest & { user?: AuthUser };

/** Route is reachable without a token; a valid token is still decoded when present. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restricts a route to platform staff roles (admin, editor, courier). */
export const RequirePlatformRole = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);

/** The authenticated user. Throws on public routes when no token was sent. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<RequestWithUser>().user;
  if (!user) throw new UnauthorizedError();
  return user;
});

/** The authenticated user, or `null` for anonymous callers on public routes. */
export const OptionalUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null => ctx.switchToHttp().getRequest<RequestWithUser>().user ?? null,
);

export interface ClientMeta {
  ip: string;
  userAgent: string | null;
}

export const Client = createParamDecorator((_: unknown, ctx: ExecutionContext): ClientMeta => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  return { ip: req.ip, userAgent: req.headers['user-agent'] ?? null };
});
