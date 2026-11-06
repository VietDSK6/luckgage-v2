import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import {
  RemotePackingSuggestionsRepository,
  type PackingSuggestionsRepository,
} from './PackingSuggestionsRepository';

const PackingSuggestionsRepositoryContext =
  createContext<PackingSuggestionsRepository | null>(null);

export function PackingSuggestionsRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(
    () => new RemotePackingSuggestionsRepository(apiClient),
    [apiClient],
  );

  return (
    <PackingSuggestionsRepositoryContext.Provider value={repository}>
      {children}
    </PackingSuggestionsRepositoryContext.Provider>
  );
}

export function usePackingSuggestionsRepository(): PackingSuggestionsRepository {
  const repository = useContext(PackingSuggestionsRepositoryContext);
  if (!repository) {
    throw new Error(
      'usePackingSuggestionsRepository must be used inside PackingSuggestionsRepositoryProvider',
    );
  }
  return repository;
}
