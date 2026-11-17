import { describe, expect, it } from 'vitest';

import { TripType } from '../generated/prisma/enums.js';
import { ApiLocale, WeatherStatus } from '../weather/weather.dto.js';
import { generatePackingPreview, type EngineRule } from './packing-engine.js';
import { curatedPackingRules } from './packing-rule-catalog.js';

const rules: EngineRule[] = curatedPackingRules.map((entry) => ({
  ...entry,
  id: `${entry.key}:${entry.version}`,
  tripType: entry.tripType ?? null,
  minDays: entry.minDays ?? null,
  maxDays: null,
  minTempC: entry.minTempC ?? null,
  maxTempC: entry.maxTempC ?? null,
  minRainPercent: entry.minRainPercent ?? null,
  activityKey: entry.activityKey ?? null,
}));

function preview(tripType: TripType, activities: string[] = [], weather = false) {
  return generatePackingPreview(
    rules,
    {
      tripType,
      durationDays: 3,
      activities,
      locale: ApiLocale.vi,
      ...(weather ? { lowTemperatureCelsius: 12, highTemperatureCelsius: 33, rainChancePercent: 75 } : {}),
    },
    weather ? WeatherStatus.FRESH : WeatherStatus.UNAVAILABLE,
  );
}

describe('curated packing catalog', () => {
  it('has unique revision and item keys with complete translations', () => {
    expect(new Set(curatedPackingRules.map(({ key, version }) => `${key}:${version}`)).size).toBe(curatedPackingRules.length);
    for (const rule of curatedPackingRules) {
      expect(rule.reasonVi.trim()).not.toBe('');
      expect(rule.reasonEn.trim()).not.toBe('');
      expect(new Set(rule.items.map((item) => `${item.categoryKey}:${item.itemKey}`)).size).toBe(rule.items.length);
      expect(rule.items.length).toBeLessThanOrEqual(50);
      for (const item of rule.items) {
        expect(item.itemNameVi.trim()).not.toBe('');
        expect(item.itemNameEn.trim()).not.toBe('');
      }
    }
  });

  it('gives every trip type a useful preview without weather', () => {
    for (const tripType of Object.values(TripType)) {
      const result = preview(tripType);
      const items = result.categories.flatMap((category) => category.items);
      expect(items.length).toBeGreaterThanOrEqual(12);
      expect(items.length).toBeLessThan(30);
      expect(new Set(items.map((item) => item.clientKey)).size).toBe(items.length);
    }
  });

  it('adds activity and weather items only when those inputs match', () => {
    const base = preview(TripType.BEACH);
    const active = preview(TripType.BEACH, ['photography'], true);
    const keys = (result: typeof base) => result.categories.flatMap((category) => category.items.map((item) => item.clientKey));
    expect(keys(base)).not.toContain('electronics:camera');
    expect(keys(base)).not.toContain('clothing:rain-jacket');
    expect(keys(active)).toContain('electronics:camera');
    expect(keys(active)).toContain('clothing:rain-jacket');
    expect(keys(active)).toContain('clothing:warm-jacket');
    expect(keys(active)).toContain('clothing:light-clothing');
  });
});
