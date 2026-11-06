import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import type { ChecklistRepository } from './ChecklistRepository';
import { RemoteChecklistRepository } from './RemoteChecklistRepository';

const ChecklistRepositoryContext = createContext<ChecklistRepository | null>(null);

export function ChecklistRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(() => new RemoteChecklistRepository(apiClient), [apiClient]);

  return (
    <ChecklistRepositoryContext.Provider value={repository}>
      {children}
    </ChecklistRepositoryContext.Provider>
  );
}

export function useChecklistRepository(): ChecklistRepository {
  const repository = useContext(ChecklistRepositoryContext);
  if (!repository) {
    throw new Error('useChecklistRepository must be used inside ChecklistRepositoryProvider');
  }
  return repository;
}
