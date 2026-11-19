import type { PlatformRole } from '@dari/contracts';

/** Identity attached to an authenticated request (decoded from the access token). */
export interface AuthUser {
  id: string;
  role: PlatformRole;
  sessionId: string;
}

export interface AccessTokenClaims {
  sub: string;
  role: PlatformRole;
  sid: string;
}
