import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useApiClient } from '@/data/remote/ApiClientProvider';
import { GuidesRepository } from './GuidesRepository';

const Context = createContext<GuidesRepository | null>(null);
export function GuidesRepositoryProvider({ children }: PropsWithChildren) {
  const api = useApiClient();
  const repository = useMemo(() => new GuidesRepository(api), [api]);
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function useGuidesRepository(): GuidesRepository {
  const repository = useContext(Context);
  if (!repository) throw new Error('GuidesRepositoryProvider is missing');
  return repository;
}
