import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { ExpoNotificationScheduler } from '@/platform/notifications/NotificationScheduler';

import { SQLiteReminderRepository, type ReminderRepository } from './ReminderRepository';

const ReminderRepositoryContext = createContext<ReminderRepository | null>(null);

export function ReminderRepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const repository = useMemo(
    () => new SQLiteReminderRepository(database, new ExpoNotificationScheduler()),
    [database],
  );

  return (
    <ReminderRepositoryContext.Provider value={repository}>
      {children}
    </ReminderRepositoryContext.Provider>
  );
}

export function useReminderRepository(): ReminderRepository {
  const repository = useContext(ReminderRepositoryContext);
  if (!repository) throw new Error('useReminderRepository must be used inside ReminderRepositoryProvider');
  return repository;
}
