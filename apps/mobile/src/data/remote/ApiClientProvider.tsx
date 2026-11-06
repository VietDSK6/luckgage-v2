import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import {
  ExpoSecureRefreshCredentialStore,
  type RefreshCredentialStore,
} from '@/platform/security/refreshCredentialStore';

import { ApiClient, resolveApiBaseUrl } from './ApiClient';

const ApiClientContext = createContext<ApiClient | null>(null);

type ApiClientProviderProps = PropsWithChildren<{
  client?: ApiClient;
  credentialStore?: RefreshCredentialStore;
}>;

export function ApiClientProvider({
  children,
  client,
  credentialStore,
}: ApiClientProviderProps) {
  const value = useMemo(
    () =>
      client ??
      new ApiClient(
        resolveApiBaseUrl(),
        credentialStore ?? new ExpoSecureRefreshCredentialStore(),
      ),
    [client, credentialStore],
  );

  return <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient must be used inside ApiClientProvider');
  return client;
}
