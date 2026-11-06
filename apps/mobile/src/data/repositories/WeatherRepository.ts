import type { Trip } from '@/features/trips/domain/trip';
import type { WeatherForecast } from '@/features/weather/domain/weather';
import type { AppLanguage } from '@/platform/preferences/preferences';

export type WeatherRepositoryErrorCode = 'UNAVAILABLE' | 'NETWORK' | 'INVALID_DATA';

export class WeatherRepositoryError extends Error {
  constructor(
    readonly code: WeatherRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'WeatherRepositoryError';
  }
}

export interface WeatherRepository {
  getWeather(trip: Trip, language: AppLanguage, forceRefresh?: boolean): Promise<WeatherForecast>;
}
