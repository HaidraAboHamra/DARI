import type { AuthTokens, UserProfile } from '@dari/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { registerForPush, unregisterPush } from './push';

interface AuthApi {
  user: UserProfile | null;
  ready: boolean;
  requestCode(phone: string): Promise<void>;
  verifyCode(phone: string, code: string): Promise<void>;
  logout(): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

/** Session state for the whole app. Tokens never leave the API client + keychain. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.listen((tokens: AuthTokens | null) => setUser(tokens?.user ?? null));
    void api.restore().finally(() => setReady(true));
  }, []);

  const requestCode = useCallback(async (phone: string) => {
    await api.post('/auth/otp/request', { phone });
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    const tokens = await api.post<AuthTokens>('/auth/otp/verify', { phone, code, deviceName: 'mobile' });
    await api.startSession(tokens);
    void registerForPush().catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    await unregisterPush();
    await api.post('/auth/logout').catch(() => undefined);
    await api.endSession();
  }, []);

  const refreshProfile = useCallback(async () => {
    setUser(await api.get<UserProfile>('/me'));
  }, []);

  const value = useMemo(() => ({ user, ready, requestCode, verifyCode, logout, refreshProfile }), [user, ready, requestCode, verifyCode, logout, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
