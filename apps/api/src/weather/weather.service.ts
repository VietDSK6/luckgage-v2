import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { dateToCalendarDate } from '../common/calendar-date.js';
import type { Environment } from '../config/environment.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { WeatherClient } from './weather.client.js';
import {
  WeatherStatus,
  type LocationDto,
  type WeatherDayDto,
  type WeatherResponseDto,
} from './weather.dto.js';

type WeatherPayload = {
  daily: WeatherDayDto[];
  lowTemperatureCelsius: number;
  highTemperatureCelsius: number;
  rainChancePercent: number;
};

@Injectable()
export class WeatherService {
  private readonly cacheTtlMs: number;
  private readonly locationCache = new Map<
    string,
    { expiresAt: number; items: LocationDto[] }
  >();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(WeatherClient) private readonly client: WeatherClient,
    @Inject(ConfigService) config: ConfigService<Environment, true>,
  ) {
    this.cacheTtlMs = config.get('WEATHER_CACHE_TTL_MINUTES', { infer: true }) * 60_000;
  }

  async searchLocations(query: string, locale: 'vi' | 'en'): Promise<LocationDto[]> {
    const cacheKey = `${locale}:${query.trim().toLocaleLowerCase(locale)}`;
    const cached = this.locationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.items;
    try {
      const items = await this.client.searchLocations(query, locale);
      this.locationCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, items });
      this.pruneLocationCache();
      return items;
    } catch (error) {
      if (cached) return cached.items;
      throw error;
    }
  }

  async getTripWeather(userId: string, tripId: string): Promise<WeatherResponseDto> {
    await this.memberships.requireMember(userId, tripId);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return unavailableWeather();
    }
    const cached = await this.prisma.weatherCache.findUnique({ where: { tripId } });
    if (cached && cached.expiresAt > new Date() && cacheMatchesTrip(cached, trip)) {
      const freshCache = fromCache(cached, WeatherStatus.CACHED);
      if (freshCache) return freshCache;
    }

    try {
      let latitude = trip.latitude?.toNumber();
      let longitude = trip.longitude?.toNumber();
      let timezone = trip.destinationTimezone;
      if (latitude === undefined || longitude === undefined || !timezone) {
        const location = (await this.client.searchLocations(trip.destinationLabel, 'en'))[0];
        if (!location) {
          throw new Error('Trip destination could not be located.');
        }
        latitude = location.latitude;
        longitude = location.longitude;
        timezone = location.timezone;
      }
      const daily = await this.client.getForecast({
        latitude,
        longitude,
        timezone,
        startDate: dateToCalendarDate(trip.startDate),
        endDate: dateToCalendarDate(trip.endDate),
      });
      const payload = summarize(daily);
      const fetchedAt = new Date();
      await this.prisma.weatherCache.upsert({
        where: { tripId },
        create: {
          tripId,
          startDate: trip.startDate,
          endDate: trip.endDate,
          latitude,
          longitude,
          payload: payload as unknown as Prisma.InputJsonValue,
          fetchedAt,
          expiresAt: new Date(fetchedAt.getTime() + this.cacheTtlMs),
        },
        update: {
          startDate: trip.startDate,
          endDate: trip.endDate,
          latitude,
          longitude,
          payload: payload as unknown as Prisma.InputJsonValue,
          cacheVersion: 1,
          fetchedAt,
          expiresAt: new Date(fetchedAt.getTime() + this.cacheTtlMs),
        },
      });
      return { status: WeatherStatus.FRESH, fetchedAt: fetchedAt.toISOString(), ...payload };
    } catch {
      return (cached && cacheMatchesTrip(cached, trip)
        ? fromCache(cached, WeatherStatus.CACHED)
        : null) ?? unavailableWeather();
    }
  }

  private pruneLocationCache(): void {
    if (this.locationCache.size <= 200) return;
    const now = Date.now();
    for (const [key, entry] of this.locationCache) {
      if (entry.expiresAt <= now || this.locationCache.size > 200) {
        this.locationCache.delete(key);
      }
    }
  }
}

function summarize(daily: WeatherDayDto[]): WeatherPayload {
  return {
    daily,
    lowTemperatureCelsius: Math.min(...daily.map((day) => day.lowTemperatureCelsius)),
    highTemperatureCelsius: Math.max(...daily.map((day) => day.highTemperatureCelsius)),
    rainChancePercent: Math.max(...daily.map((day) => day.rainChancePercent)),
  };
}

function cacheMatchesTrip(
  cache: {
    startDate: Date;
    endDate: Date;
    latitude: { toNumber(): number };
    longitude: { toNumber(): number };
  },
  trip: {
    startDate: Date;
    endDate: Date;
    latitude: { toNumber(): number } | null;
    longitude: { toNumber(): number } | null;
  },
): boolean {
  const datesMatch =
    cache.startDate.getTime() === trip.startDate.getTime() &&
    cache.endDate.getTime() === trip.endDate.getTime();
  const coordinatesMatch =
    trip.latitude === null || trip.longitude === null
      ? true
      : Math.abs(cache.latitude.toNumber() - trip.latitude.toNumber()) < 0.000001 &&
        Math.abs(cache.longitude.toNumber() - trip.longitude.toNumber()) < 0.000001;
  return datesMatch && coordinatesMatch;
}

function fromCache(
  cache: { payload: unknown; fetchedAt: Date },
  status: WeatherStatus,
): WeatherResponseDto | null {
  if (!isWeatherPayload(cache.payload)) return null;
  const payload = cache.payload;
  return { status, fetchedAt: cache.fetchedAt.toISOString(), ...payload };
}

function isWeatherPayload(value: unknown): value is WeatherPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<WeatherPayload>;
  return (
    Array.isArray(payload.daily) &&
    payload.daily.every(
      (day) =>
        typeof day?.date === 'string' &&
        typeof day.weatherCode === 'number' &&
        typeof day.highTemperatureCelsius === 'number' &&
        typeof day.lowTemperatureCelsius === 'number' &&
        typeof day.rainChancePercent === 'number',
    ) &&
    typeof payload.lowTemperatureCelsius === 'number' &&
    typeof payload.highTemperatureCelsius === 'number' &&
    typeof payload.rainChancePercent === 'number'
  );
}

function unavailableWeather(): WeatherResponseDto {
  return {
    status: WeatherStatus.UNAVAILABLE,
    fetchedAt: null,
    daily: [],
    lowTemperatureCelsius: null,
    highTemperatureCelsius: null,
    rainChancePercent: null,
  };
}
