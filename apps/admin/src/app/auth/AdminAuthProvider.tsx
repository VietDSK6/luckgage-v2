import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiError } from '@/api/ApiClient';
import { adminAuthApi } from '@/api/adminAuthApi';
import type { AdminUser, LoginInput } from '@/api/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

type AdminAuthContextValue = {
  csrfToken: string | null;
  error: ApiError | null;
  expireSession: () => void;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => Promise<void>;
  status: AuthStatus;
  user: AdminUser | null;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const restoreRequest = useRef<AbortController | null>(null);

  const restoreSession = useCallback(async () => {
    restoreRequest.current?.abort();
    const controller = new AbortController();
    restoreRequest.current = controller;
    setStatus('loading');
    setError(null);
    try {
      const session = await adminAuthApi.getSession(controller.signal);
      setUser(session.user);
      setCsrfToken(session.csrfToken);
      setStatus('authenticated');
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
      if (nextError instanceof ApiError && nextError.status === 401) {
        setUser(null);
        setCsrfToken(null);
        setStatus('anonymous');
        return;
      }
      const apiError = toApiError(nextError);
      setError(apiError);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    restoreRequest.current = controller;
    adminAuthApi
      .getSession(controller.signal)
      .then((session) => {
        setUser(session.user);
        setCsrfToken(session.csrfToken);
        setStatus('authenticated');
      })
      .catch((nextError: unknown) => {
        if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
        if (nextError instanceof ApiError && nextError.status === 401) {
          setStatus('anonymous');
          return;
        }
        setError(toApiError(nextError));
        setStatus('error');
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await adminAuthApi.login({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    queryClient.clear();
    setUser(session.user);
    setCsrfToken(session.csrfToken);
    setError(null);
    setStatus('authenticated');
  }, [queryClient]);

  const expireSession = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setCsrfToken(null);
    setError(null);
    setStatus('anonymous');
  }, [queryClient]);

  const logout = useCallback(async () => {
    if (!csrfToken) {
      queryClient.clear();
      setUser(null);
      setError(null);
      setStatus('anonymous');
      return;
    }
    try {
      await adminAuthApi.logout(csrfToken);
    } catch (nextError) {
      if (!(nextError instanceof ApiError && nextError.status === 401)) throw nextError;
    }
    setUser(null);
    setCsrfToken(null);
    setError(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [csrfToken, queryClient]);

  const value = useMemo(
    () => ({ csrfToken, error, expireSession, login, logout, retrySession: restoreSession, status, user }),
    [csrfToken, error, expireSession, login, logout, restoreSession, status, user],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return value;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    code: 'UNKNOWN_ERROR',
    detail: 'Không thể kiểm tra phiên quản trị. Hãy thử kết nối lại.',
    status: 0,
  });
}
