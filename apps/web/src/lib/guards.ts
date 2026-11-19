import 'server-only';
import type { PlatformRole } from '@dari/contracts';
import { redirect } from 'next/navigation';
import { currentUser, type SessionUser } from './session';

/** Server-side page guard: unauthenticated users go to login and come back. */
export async function requireUser(next: string, roles?: PlatformRole[]): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (roles && !roles.includes(user.role) && user.role !== 'admin') redirect('/');
  return user;
}
