import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type { ApiWeatherResponse } from '@/data/remote/apiTypes';
import { parseCalendarDate } from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';
import type { WeatherDay, WeatherForecast } from '@/features/weather/domain/weather';
import type { AppLanguage } from '@/platform/preferences/preferences';

import {
  WeatherRepositoryError,
  type WeatherRepository,
} from './WeatherRepository';

export class RemoteWeatherRepository implements WeatherRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async getWeather(
    trip: Trip,
    _language: AppLanguage,
    _forceRefresh = false,
  ): Promise<WeatherForecast> {
    try {
      const payload = await this.apiClient.request<ApiWeatherResponse>(
        `/trips/${trip.id}/weather`,
      );
      return mapWeatherResponse(trip, payload);
    } catch (error) {
      if (error instanceof WeatherRepositoryError) throw error;
      if (error instanceof ApiClientError && error.status === 0) {
        throw new WeatherRepositoryError('NETWORK', 'Weather service could not be reached', {
          cause: error,
        });
      }
      throw new WeatherRepositoryError('INVALID_DATA', 'Weather response could not be read', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}

export function mapWeatherResponse(
  trip: Trip,
  payload: ApiWeatherResponse,
): WeatherForecast {
  if (payload?.status === 'UNAVAILABLE') {
    throw new WeatherRepositoryError('UNAVAILABLE', 'Weather is unavailable for this trip');
  }
  if (
    (payload?.status !== 'FRESH' && payload?.status !== 'CACHED') ||
    !payload.fetchedAt ||
    !Array.isArray(payload.daily) ||
    payload.daily.length === 0 ||
    typeof payload.lowTemperatureCelsius !== 'number' ||
    !Number.isFinite(payload.lowTemperatureCelsius) ||
    typeof payload.highTemperatureCelsius !== 'number' ||
    !Number.isFinite(payload.highTemperatureCelsius) ||
    typeof payload.rainChancePercent !== 'number' ||
    !Number.isFinite(payload.rainChancePercent)
  ) {
    throw new WeatherRepositoryError('INVALID_DATA', 'Weather response is incomplete');
  }

  const fetchedAt = Date.parse(payload.fetchedAt);
  if (!Number.isFinite(fetchedAt)) {
    throw new WeatherRepositoryError('INVALID_DATA', 'Weather timestamp is invalid');
  }

  const days = payload.daily.map(mapWeatherDay);
  return {
    tripId: trip.id,
    destination: trip.destination,
    lowTemperatureCelsius: payload.lowTemperatureCelsius,
    highTemperatureCelsius: payload.highTemperatureCelsius,
    rainChancePercent: payload.rainChancePercent,
    weatherCode: days[0].weatherCode,
    days,
    fetchedAt,
    source: payload.status === 'FRESH' ? 'fresh' : 'cached',
  };
}

function mapWeatherDay(payload: ApiWeatherResponse['daily'][number]): WeatherDay {
  const date = parseCalendarDate(payload?.date);
  if (
    !date ||
    !Number.isFinite(payload.weatherCode) ||
    !Number.isFinite(payload.highTemperatureCelsius) ||
    !Number.isFinite(payload.lowTemperatureCelsius) ||
    !Number.isFinite(payload.rainChancePercent)
  ) {
    throw new WeatherRepositoryError('INVALID_DATA', 'Weather day is incomplete');
  }
  return {
    date,
    weatherCode: payload.weatherCode,
    highTemperatureCelsius: payload.highTemperatureCelsius,
    lowTemperatureCelsius: payload.lowTemperatureCelsius,
    rainChancePercent: Math.max(0, Math.min(100, payload.rainChancePercent)),
  };
}
