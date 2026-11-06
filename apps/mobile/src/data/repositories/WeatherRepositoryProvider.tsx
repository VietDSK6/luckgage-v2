import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { useApiClient } from '@/data/remote/ApiClientProvider';

import { RemoteWeatherRepository } from './RemoteWeatherRepository';
import type { WeatherRepository } from './WeatherRepository';

const WeatherRepositoryContext = createContext<WeatherRepository | null>(null);

export function WeatherRepositoryProvider({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const repository = useMemo(() => new RemoteWeatherRepository(apiClient), [apiClient]);

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
