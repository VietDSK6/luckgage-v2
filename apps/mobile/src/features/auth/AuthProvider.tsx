import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';
import type { ApiLocale, ApiUser, AuthSession } from '@/data/remote/apiTypes';
import { logError } from '@/platform/logging/logger';

export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'restoreError';

type AuthContextValue = {
  status: AuthStatus;
  user: ApiUser | null;
  restoreError: Error | null;
  login(input: { email: string; password: string }): Promise<void>;
  register(input: {
    email: string;
    password: string;
    displayName: string;
    locale: ApiLocale;
  }): Promise<void>;
  logout(): Promise<void>;
  retryRestore(): Promise<void>;
  clearLocalSession(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useApiClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [restoreError, setRestoreError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = client.subscribe((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      setRestoreError(null);
    });

    client.restoreSession().catch((error: unknown) => {
      if (!active) return;
      const normalized = error instanceof Error ? error : new Error('Session restore failed');
      logError('auth.session.restore', normalized);
      setRestoreError(normalized);
      setStatus('restoreError');
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      await client.login(input);
    },
    [client],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      locale: ApiLocale;
    }) => {
      await client.register(input);
    },
    [client],
  );

  const logout = useCallback(async () => {
    setStatus('initializing');
    await client.logout();
  }, [client]);

  const retryRestore = useCallback(async () => {
    setStatus('initializing');
    setRestoreError(null);
    try {
      await client.restoreSession();
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error('Session restore failed');
      logError('auth.session.retry', normalized);
      setRestoreError(normalized);
      setStatus('restoreError');
    }
  }, [client]);

  const clearLocalSession = useCallback(async () => {
    setStatus('initializing');
    await client.logout();
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      restoreError,
      login,
      register,
      logout,
      retryRestore,
      clearLocalSession,
    }),
    [clearLocalSession, login, logout, register, restoreError, retryRestore, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
