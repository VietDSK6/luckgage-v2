import Storage from 'expo-sqlite/kv-store';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { DeviceCalendarGateway } from '@/platform/calendar/DeviceCalendarGateway';

import { StoredCalendarRepository, type CalendarRepository } from './CalendarRepository';

const CalendarRepositoryContext = createContext<CalendarRepository | null>(null);

export function CalendarRepositoryProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => new StoredCalendarRepository(Storage, new DeviceCalendarGateway()), []);

  return <CalendarRepositoryContext.Provider value={repository}>{children}</CalendarRepositoryContext.Provider>;
}

export function useCalendarRepository(): CalendarRepository {
  const repository = useContext(CalendarRepositoryContext);
  if (!repository) throw new Error('useCalendarRepository must be used inside CalendarRepositoryProvider');
  return repository;
}
