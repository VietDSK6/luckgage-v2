import type { SQLiteDatabase } from 'expo-sqlite';

import type { Trip } from '@/features/trips/domain/trip';

import { OpenMeteoWeatherRepository, mapForecastDays } from './WeatherRepository';

const trip: Trip = {
  id: 'trip-1',
  name: 'Đà Nẵng',
  destination: 'Đà Nẵng',
  startDate: '2026-11-06' as Trip['startDate'],
  endDate: '2026-11-08' as Trip['endDate'],
  tripType: 'beach',
  note: null,
  createdAt: 1,
  updatedAt: 1,
};

describe('OpenMeteoWeatherRepository', () => {
  test('maps complete daily forecast data', () => {
    expect(
      mapForecastDays({
        daily: {
          time: ['2026-11-06', '2026-11-07'],
          weather_code: [1, 61],
          temperature_2m_max: [31, 29],
          temperature_2m_min: [24, 23],
          precipitation_probability_max: [10, 70],
        },
      }),
    ).toEqual([
      expect.objectContaining({ date: '2026-11-06', weatherCode: 1, rainChancePercent: 10 }),
      expect.objectContaining({ date: '2026-11-07', weatherCode: 61, rainChancePercent: 70 }),
    ]);
  });

  test('fetches geocoding and forecast, then stores the result without blocking on cache writes', async () => {
    const getFirstAsync = jest.fn(async () => null);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response({ results: [{ latitude: 16.06, longitude: 108.2, timezone: 'Asia/Bangkok' }] }))
      .mockResolvedValueOnce(
        response({
          daily: {
            time: ['2026-11-06', '2026-11-07', '2026-11-08'],
            weather_code: [1, 2, 61],
            temperature_2m_max: [31, 30, 29],
            temperature_2m_min: [24, 23, 22],
            precipitation_probability_max: [10, 20, 80],
          },
        }),
      );
    const repository = new OpenMeteoWeatherRepository(
      { getFirstAsync, runAsync } as unknown as SQLiteDatabase,
      fetcher as typeof globalThis.fetch,
      () => Date.parse('2026-11-05T03:00:00Z'),
    );

    await expect(repository.getWeather(trip, 'vi')).resolves.toMatchObject({
      source: 'fresh',
      lowTemperatureCelsius: 22,
      highTemperatureCelsius: 31,
      rainChancePercent: 80,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO weather_cache'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  test('returns stale matching cache when the network fails', async () => {
    const cached = {
      ...weatherForecast(),
      source: 'fresh' as const,
      isStale: false,
    };
    const getFirstAsync = jest.fn(async () => ({
      trip_id: trip.id,
      destination: trip.destination,
      start_date: trip.startDate,
      end_date: trip.endDate,
      payload_json: JSON.stringify(cached),
      fetched_at: 1,
    }));
    const fetcher = jest.fn(async () => {
      throw new Error('offline');
    });
    const repository = new OpenMeteoWeatherRepository(
      { getFirstAsync } as unknown as SQLiteDatabase,
      fetcher as unknown as typeof globalThis.fetch,
      () => Date.parse('2026-11-05T03:00:00Z'),
    );

    await expect(repository.getWeather(trip, 'vi')).resolves.toMatchObject({
      source: 'cached',
      isStale: true,
    });
  });
});

function response(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response;
}

function weatherForecast() {
  return {
    tripId: trip.id,
    destination: trip.destination,
    latitude: 16.06,
    longitude: 108.2,
    timezone: 'Asia/Bangkok',
    lowTemperatureCelsius: 22,
    highTemperatureCelsius: 31,
    rainChancePercent: 80,
    weatherCode: 1,
    days: [
      {
        date: trip.startDate,
        weatherCode: 1,
        lowTemperatureCelsius: 22,
        highTemperatureCelsius: 31,
        rainChancePercent: 80,
      },
    ],
    fetchedAt: 1,
  };
}
