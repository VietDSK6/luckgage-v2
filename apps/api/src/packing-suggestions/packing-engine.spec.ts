import { describe, expect, it } from 'vitest';

import { QuantityMode, TripType } from '../generated/prisma/enums.js';
import { ApiLocale, WeatherStatus } from '../weather/weather.dto.js';
import { generatePackingPreview, type EngineRule } from './packing-engine.js';

describe('packing rule engine', () => {
  it('matches AND conditions and deterministically merges duplicate items', () => {
    const rules: EngineRule[] = [
      rule({
        id: 'later',
        priority: 20,
        reasonEn: 'Rain is likely',
        minRainPercent: 60,
        baseQuantity: 2,
      }),
      rule({
        id: 'first',
        priority: 10,
        reasonEn: 'Beach essential',
        tripType: TripType.BEACH,
        quantityMode: QuantityMode.PER_DAY,
      }),
    ];
    const result = generatePackingPreview(
      rules,
      {
        tripType: TripType.BEACH,
        durationDays: 3,
        activities: [],
        rainChancePercent: 75,
        locale: ApiLocale.en,
      },
      WeatherStatus.FRESH,
    );

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]?.items[0]).toMatchObject({
      name: 'Rain jacket',
      quantity: 3,
      reason: 'Beach essential • Rain is likely',
      matchedRules: [
        { ruleId: 'first', version: 1 },
        { ruleId: 'later', version: 1 },
      ],
    });
  });

  it('does not match a weather-dependent rule when weather is unavailable', () => {
    const result = generatePackingPreview(
      [rule({ id: 'rain', minRainPercent: 50 })],
      {
        tripType: TripType.LEISURE,
        durationDays: 2,
        activities: [],
        locale: ApiLocale.vi,
      },
      WeatherStatus.UNAVAILABLE,
    );
    expect(result.categories).toEqual([]);
    expect(result.sourceLabel).toContain('không bắt buộc');
  });
});

function rule(
  overrides: Partial<EngineRule> & {
    id: string;
    baseQuantity?: number;
    quantityMode?: QuantityMode;
  },
): EngineRule {
  return {
    id: overrides.id,
    version: overrides.version ?? 1,
    priority: overrides.priority ?? 10,
    tripType: overrides.tripType ?? null,
    minDays: overrides.minDays ?? null,
    maxDays: overrides.maxDays ?? null,
    minTempC: overrides.minTempC ?? null,
    maxTempC: overrides.maxTempC ?? null,
    minRainPercent: overrides.minRainPercent ?? null,
    activityKey: overrides.activityKey ?? null,
    reasonVi: overrides.reasonVi ?? 'Lý do',
    reasonEn: overrides.reasonEn ?? 'Reason',
    items: [
      {
        categoryKey: 'clothing',
        categoryNameVi: 'Quần áo',
        categoryNameEn: 'Clothing',
        itemKey: 'rain-jacket',
        itemNameVi: 'Áo mưa',
        itemNameEn: 'Rain jacket',
        quantityMode: overrides.quantityMode ?? QuantityMode.FIXED,
        baseQuantity: overrides.baseQuantity ?? 1,
        noteVi: null,
        noteEn: null,
        position: 0,
      },
    ],
  };
}
