import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import {
  RemoteMembershipRepository,
  type MembershipRepository,
} from './MembershipRepository';

const MembershipRepositoryContext = createContext<MembershipRepository | null>(null);

export function MembershipRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(() => new RemoteMembershipRepository(apiClient), [apiClient]);

  return (
    <MembershipRepositoryContext.Provider value={repository}>
      {children}
    </MembershipRepositoryContext.Provider>
  );
}

export function useMembershipRepository(): MembershipRepository {
  const repository = useContext(MembershipRepositoryContext);
  if (!repository) {
    throw new Error('useMembershipRepository must be used inside MembershipRepositoryProvider');
  }
  return repository;
}
