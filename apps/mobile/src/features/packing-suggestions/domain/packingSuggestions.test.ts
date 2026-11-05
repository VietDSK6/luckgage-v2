import type { Trip } from '@/features/trips/domain/trip';
import type { WeatherForecast } from '@/features/weather/domain/weather';

import { generatePackingPreview } from './packingSuggestions';

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

describe('generatePackingPreview', () => {
  test('uses trip duration, type, and selected activities deterministically', () => {
    const preview = generatePackingPreview({
      trip,
      activities: ['photography'],
      extraNotes: '',
      weather: null,
      language: 'vi',
    });

    expect(preview.items.find((item) => item.id === 'clothing:tops')?.quantity).toBe(3);
    expect(preview.items.some((item) => item.name === 'Đồ bơi')).toBe(true);
    expect(preview.items.some((item) => item.name === 'Pin máy ảnh dự phòng')).toBe(true);
    expect(preview.sourceLabel).not.toMatch(/AI/i);
  });

  test('adds explainable rain and heat items when weather is available', () => {
    const preview = generatePackingPreview({
      trip,
      activities: [],
      extraNotes: '',
      weather: weather(),
      language: 'vi',
    });

    expect(preview.items.find((item) => item.id === 'weather:umbrella')?.reason).toContain('70%');
    expect(preview.items.some((item) => item.id === 'weather:sun-hat')).toBe(true);
    expect(preview.weatherUsed).toBe(true);
  });

  test('notes can add a rain item without weather and duplicate rules do not duplicate it', () => {
    const preview = generatePackingPreview({
      trip: { ...trip, note: 'Chuẩn bị nếu mưa' },
      activities: [],
      extraNotes: '',
      weather: weather(),
      language: 'vi',
    });

    expect(preview.items.filter((item) => item.id === 'weather:umbrella')).toHaveLength(1);
  });
});

function weather(): WeatherForecast {
  return {
    tripId: trip.id,
    destination: trip.destination,
    latitude: 16,
    longitude: 108,
    timezone: 'Asia/Bangkok',
    lowTemperatureCelsius: 24,
    highTemperatureCelsius: 32,
    rainChancePercent: 70,
    weatherCode: 61,
    days: [],
    fetchedAt: 1,
    source: 'fresh',
    isStale: false,
  };
}
