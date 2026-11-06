import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment.js';
import type { LocationDto, WeatherDayDto } from './weather.dto.js';

type GeocodingPayload = {
  results?: Array<{
    id?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    country_code?: string;
    admin1?: string;
    country?: string;
  }>;
};

type ForecastPayload = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

@Injectable()
export class WeatherClient {
  private readonly forecastBaseUrl: string;
  private readonly geocodingBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(@Inject(ConfigService) config: ConfigService<Environment, true>) {
    this.forecastBaseUrl = config.get('OPEN_METEO_BASE_URL', { infer: true });
    this.geocodingBaseUrl = config.get('OPEN_METEO_GEOCODING_BASE_URL', { infer: true });
    this.timeoutMs = config.get('OPEN_METEO_TIMEOUT_MS', { infer: true });
  }

  async searchLocations(query: string, locale: 'vi' | 'en'): Promise<LocationDto[]> {
    const url = new URL('/v1/search', this.geocodingBaseUrl);
    url.searchParams.set('name', query);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', locale);
    url.searchParams.set('format', 'json');
    const payload = await this.fetchJson<GeocodingPayload>(url);
    return (payload.results ?? []).flatMap((result) => {
      if (
        typeof result.latitude !== 'number' ||
        typeof result.longitude !== 'number' ||
        !result.timezone ||
        !result.name
      ) {
        return [];
      }
      return [
        {
          id: String(result.id ?? `${result.latitude},${result.longitude}`),
          label: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
          latitude: result.latitude,
          longitude: result.longitude,
          timezone: result.timezone,
          countryCode: result.country_code ?? null,
          adminArea: result.admin1 ?? null,
          country: result.country ?? null,
        },
      ];
    });
  }

  async getForecast(input: {
    latitude: number;
    longitude: number;
    timezone: string;
    startDate: string;
    endDate: string;
  }): Promise<WeatherDayDto[]> {
    const url = new URL('/v1/forecast', this.forecastBaseUrl);
    url.searchParams.set('latitude', String(input.latitude));
    url.searchParams.set('longitude', String(input.longitude));
    url.searchParams.set('timezone', input.timezone);
    url.searchParams.set('start_date', input.startDate);
    url.searchParams.set('end_date', input.endDate);
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    const payload = await this.fetchJson<ForecastPayload>(url);
    const daily = payload.daily;
    const dates = daily?.time ?? [];
    if (
      dates.length === 0 ||
      daily?.weather_code?.length !== dates.length ||
      daily.temperature_2m_max?.length !== dates.length ||
      daily.temperature_2m_min?.length !== dates.length ||
      daily.precipitation_probability_max?.length !== dates.length
    ) {
      throw new Error('Open-Meteo returned an invalid forecast payload.');
    }
    return dates.map((date, index) => ({
      date,
      weatherCode: daily.weather_code?.[index] ?? 0,
      highTemperatureCelsius: daily.temperature_2m_max?.[index] ?? 0,
      lowTemperatureCelsius: daily.temperature_2m_min?.[index] ?? 0,
      rainChancePercent: daily.precipitation_probability_max?.[index] ?? 0,
    }));
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) {
            continue;
          }
          throw new Error(`Open-Meteo request failed with ${response.status}.`);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt === 1) {
          break;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Open-Meteo request failed.');
  }
}
