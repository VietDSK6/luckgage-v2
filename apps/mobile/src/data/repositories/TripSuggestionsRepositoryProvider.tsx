import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import {
  RemoteTripSuggestionsRepository,
  type TripSuggestionsRepository,
} from './TripSuggestionsRepository';

const TripSuggestionsRepositoryContext = createContext<TripSuggestionsRepository | null>(null);

export function TripSuggestionsRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(() => new RemoteTripSuggestionsRepository(apiClient), [apiClient]);

  return (
    <TripSuggestionsRepositoryContext.Provider value={repository}>
      {children}
    </TripSuggestionsRepositoryContext.Provider>
  );
}

export function useTripSuggestionsRepository(): TripSuggestionsRepository {
  const repository = useContext(TripSuggestionsRepositoryContext);
  if (!repository) {
    throw new Error(
      'useTripSuggestionsRepository must be used inside TripSuggestionsRepositoryProvider',
    );
  }
  return repository;
}
