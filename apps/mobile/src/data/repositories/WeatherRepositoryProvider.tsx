import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { OpenMeteoWeatherRepository, type WeatherRepository } from './WeatherRepository';

const WeatherRepositoryContext = createContext<WeatherRepository | null>(null);

export function WeatherRepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new OpenMeteoWeatherRepository(database), [database]);

  return (
    <WeatherRepositoryContext.Provider value={repository}>
      {children}
    </WeatherRepositoryContext.Provider>
  );
}

export function useWeatherRepository(): WeatherRepository {
  const repository = useContext(WeatherRepositoryContext);
  if (!repository) throw new Error('useWeatherRepository must be used inside WeatherRepositoryProvider');
  return repository;
}
