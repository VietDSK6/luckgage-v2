import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { SQLiteChecklistRepository, type ChecklistRepository } from './ChecklistRepository';

const ChecklistRepositoryContext = createContext<ChecklistRepository | null>(null);

export function ChecklistRepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SQLiteChecklistRepository(database), [database]);

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
