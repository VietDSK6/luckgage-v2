import type { SQLiteDatabase } from 'expo-sqlite';

import {
  addCalendarDays,
  calendarDateFromLocalDate,
  compareCalendarDates,
  parseCalendarDate,
  type CalendarDate,
} from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';
import type { WeatherDay, WeatherForecast } from '@/features/weather/domain/weather';
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

type WeatherCacheRow = {
  trip_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  payload_json: string;
  fetched_at: number;
};

type GeocodingResponse = {
  results?: {
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }[];
};

type ForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const MAX_FORECAST_DAYS_AHEAD = 15;
const REQUEST_TIMEOUT_MS = 8_000;

export class OpenMeteoWeatherRepository implements WeatherRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly fetcher: typeof globalThis.fetch = globalThis.fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async getWeather(
    trip: Trip,
    language: AppLanguage,
    forceRefresh = false,
  ): Promise<WeatherForecast> {
    const { requestStart, requestEnd } = getForecastRange(trip, this.now());
    const cached = await this.readCache(trip.id, trip.destination, requestStart, requestEnd);
    const currentTime = this.now();

    if (!forceRefresh && cached && currentTime - cached.fetchedAt <= CACHE_TTL_MS) {
      return { ...cached, source: 'cached', isStale: false };
    }

    try {
      const location = await this.geocode(trip.destination, language);
      const forecast = await this.fetchForecast(trip, location, requestStart, requestEnd, currentTime);
      await this.writeCache(forecast, requestStart, requestEnd);
      return forecast;
    } catch (error) {
      if (cached) return { ...cached, source: 'cached', isStale: true };
      if (error instanceof WeatherRepositoryError) throw error;
      throw new WeatherRepositoryError('NETWORK', 'Weather service could not be reached', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private async geocode(destination: string, language: AppLanguage) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', destination);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', language);
    url.searchParams.set('format', 'json');
    const response = await fetchWithTimeout(this.fetcher, url.toString());
    if (!response.ok) throw new WeatherRepositoryError('NETWORK', 'Location lookup failed');
    const payload = (await response.json()) as GeocodingResponse;
    const result = payload.results?.[0];
    if (
      !result ||
      typeof result.latitude !== 'number' ||
      typeof result.longitude !== 'number' ||
      !result.timezone
    ) {
      throw new WeatherRepositoryError('UNAVAILABLE', 'Destination could not be located');
    }
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };
  }

  private async fetchForecast(
    trip: Trip,
    location: { latitude: number; longitude: number; timezone: string },
    requestStart: CalendarDate,
    requestEnd: CalendarDate,
    fetchedAt: number,
  ): Promise<WeatherForecast> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('start_date', requestStart);
    url.searchParams.set('end_date', requestEnd);
    url.searchParams.set('timezone', location.timezone);
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    const response = await fetchWithTimeout(this.fetcher, url.toString());
    if (!response.ok) throw new WeatherRepositoryError('NETWORK', 'Forecast request failed');
    const payload = (await response.json()) as ForecastResponse;
    const days = mapForecastDays(payload);

    return {
      tripId: trip.id,
      destination: trip.destination,
      ...location,
      lowTemperatureCelsius: Math.min(...days.map((day) => day.lowTemperatureCelsius)),
      highTemperatureCelsius: Math.max(...days.map((day) => day.highTemperatureCelsius)),
      rainChancePercent: Math.max(...days.map((day) => day.rainChancePercent)),
      weatherCode: days[0].weatherCode,
      days,
      fetchedAt,
      source: 'fresh',
      isStale: false,
    };
  }

  private async readCache(
    tripId: string,
    destination: string,
    startDate: CalendarDate,
    endDate: CalendarDate,
  ): Promise<WeatherForecast | null> {
    try {
      const row = await this.database.getFirstAsync<WeatherCacheRow>(
        `SELECT trip_id, destination, start_date, end_date, payload_json, fetched_at
         FROM weather_cache WHERE trip_id = ?`,
        tripId,
      );
      if (
        !row ||
        row.destination !== destination ||
        row.start_date !== startDate ||
        row.end_date !== endDate
      ) {
        return null;
      }
      const parsed = JSON.parse(row.payload_json) as WeatherForecast;
      return validateCachedWeather(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async writeCache(
    weather: WeatherForecast,
    startDate: CalendarDate,
    endDate: CalendarDate,
  ): Promise<void> {
    try {
      await this.database.runAsync(
        `INSERT INTO weather_cache
          (trip_id, destination, start_date, end_date, payload_json, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(trip_id) DO UPDATE SET
          destination = excluded.destination,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          payload_json = excluded.payload_json,
          fetched_at = excluded.fetched_at`,
        weather.tripId,
        weather.destination,
        startDate,
        endDate,
        JSON.stringify(weather),
        weather.fetchedAt,
      );
    } catch {
      // Weather cache failure must never hide a valid remote forecast.
    }
  }
}

export function mapForecastDays(payload: ForecastResponse): WeatherDay[] {
  const daily = payload.daily;
  const dates = daily?.time;
  const codes = daily?.weather_code;
  const highs = daily?.temperature_2m_max;
  const lows = daily?.temperature_2m_min;
  const rain = daily?.precipitation_probability_max;

  if (!dates?.length || !codes || !highs || !lows) {
    throw new WeatherRepositoryError('INVALID_DATA', 'Forecast response is incomplete');
  }

  return dates.map((date, index) => {
    const parsedDate = parseCalendarDate(date);
    const weatherCode = codes[index];
    const high = highs[index];
    const low = lows[index];
    if (!parsedDate || !Number.isFinite(weatherCode) || !Number.isFinite(high) || !Number.isFinite(low)) {
      throw new WeatherRepositoryError('INVALID_DATA', 'Forecast day is incomplete');
    }
    return {
      date: parsedDate,
      weatherCode,
      highTemperatureCelsius: high,
      lowTemperatureCelsius: low,
      rainChancePercent: Math.max(0, Math.min(100, rain?.[index] ?? 0)),
    };
  });
}

function getForecastRange(trip: Trip, now: number) {
  const today = calendarDateFromLocalDate(new Date(now));
  const latest = addCalendarDays(today, MAX_FORECAST_DAYS_AHEAD);
  const requestStart = compareCalendarDates(trip.startDate, today) < 0 ? today : trip.startDate;

  if (
    compareCalendarDates(trip.endDate, today) < 0 ||
    compareCalendarDates(requestStart, latest) > 0
  ) {
    throw new WeatherRepositoryError('UNAVAILABLE', 'Trip is outside the forecast window');
  }

  return {
    requestStart,
    requestEnd: compareCalendarDates(trip.endDate, latest) > 0 ? latest : trip.endDate,
  };
}

function validateCachedWeather(value: WeatherForecast): boolean {
  return (
    typeof value?.tripId === 'string' &&
    typeof value?.fetchedAt === 'number' &&
    Array.isArray(value?.days) &&
    value.days.length > 0
  );
}

async function fetchWithTimeout(
  fetcher: typeof globalThis.fetch,
  url: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetcher(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
