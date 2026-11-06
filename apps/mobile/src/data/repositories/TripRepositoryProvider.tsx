import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import { RemoteTripRepository } from './RemoteTripRepository';
import type { TripRepository } from './TripRepository';

const TripRepositoryContext = createContext<TripRepository | null>(null);

export function TripRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(() => new RemoteTripRepository(apiClient), [apiClient]);

  return (
    <TripRepositoryContext.Provider value={repository}>{children}</TripRepositoryContext.Provider>
  );
}

export function useTripRepository(): TripRepository {
  const repository = useContext(TripRepositoryContext);

  if (!repository) {
    throw new Error('useTripRepository must be used inside TripRepositoryProvider');
  }

  return repository;
}
