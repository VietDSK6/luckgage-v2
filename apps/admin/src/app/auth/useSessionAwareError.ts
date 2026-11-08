import { useEffect } from 'react';

import { ApiError } from '@/api/ApiClient';

import { useAdminAuth } from './AdminAuthProvider';

export function useSessionAwareError(error: unknown): void {
  const { expireSession } = useAdminAuth();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) expireSession();
  }, [error, expireSession]);
}
