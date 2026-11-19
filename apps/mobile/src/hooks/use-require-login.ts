import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/** Sends anonymous users to the login modal; returns whether a user is present. */
export function useRequireLogin(): boolean {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user]);
  return Boolean(user);
}
