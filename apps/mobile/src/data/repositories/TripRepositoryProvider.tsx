import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { SQLiteTripRepository, type TripRepository } from './TripRepository';

const TripRepositoryContext = createContext<TripRepository | null>(null);

export function TripRepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SQLiteTripRepository(database), [database]);

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
