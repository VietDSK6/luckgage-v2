import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import { TravelStatsRepository } from './TravelStatsRepository';

const TravelStatsRepositoryContext = createContext<TravelStatsRepository | null>(null);

export function TravelStatsRepositoryProvider({ children }: PropsWithChildren) {
  const api = useApiClient();
  const repository = useMemo(() => new TravelStatsRepository(api), [api]);

  return <TravelStatsRepositoryContext.Provider value={repository}>{children}</TravelStatsRepositoryContext.Provider>;
}

export function useTravelStatsRepository(): TravelStatsRepository {
  const repository = useContext(TravelStatsRepositoryContext);
  if (!repository) throw new Error('useTravelStatsRepository must be used inside TravelStatsRepositoryProvider');
  return repository;
}
