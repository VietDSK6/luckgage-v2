import Storage from 'expo-sqlite/kv-store';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { ExpoNotificationScheduler } from '@/platform/notifications/NotificationScheduler';

import { StoredReminderRepository, type ReminderRepository } from './ReminderRepository';

const ReminderRepositoryContext = createContext<ReminderRepository | null>(null);

export function ReminderRepositoryProvider({ children }: PropsWithChildren) {
  const repository = useMemo(
    () => new StoredReminderRepository(Storage, new ExpoNotificationScheduler()),
    [],
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
