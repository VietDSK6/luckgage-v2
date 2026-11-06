import { QuantityMode, type TripType } from '../generated/prisma/enums.js';
import { ApiLocale, WeatherStatus } from '../weather/weather.dto.js';
import type { PackingPreviewDto, PackingPreviewItemDto, RuleSampleDto } from './packing.dto.js';

export type EngineRule = {
  id: string;
  version: number;
  priority: number;
  tripType: TripType | null;
  minDays: number | null;
  maxDays: number | null;
  minTempC: { toNumber(): number } | number | null;
  maxTempC: { toNumber(): number } | number | null;
  minRainPercent: number | null;
  activityKey: string | null;
  reasonVi: string;
  reasonEn: string;
  items: Array<{
    categoryKey: string;
    categoryNameVi: string;
    categoryNameEn: string;
    itemKey: string;
    itemNameVi: string;
    itemNameEn: string;
    quantityMode: QuantityMode;
    baseQuantity: number;
    noteVi: string | null;
    noteEn: string | null;
    position: number;
  }>;
};

export function generatePackingPreview(
  rules: EngineRule[],
  sample: RuleSampleDto,
  weatherStatus: WeatherStatus,
): PackingPreviewDto {
  const matched = rules
    .filter((rule) => matches(rule, sample))
    .sort((left, right) => left.priority - right.priority);
  const categories = new Map<
    string,
    { name: string; items: Map<string, PackingPreviewItemDto> }
  >();
  for (const rule of matched) {
    for (const item of [...rule.items].sort((left, right) => left.position - right.position)) {
      const category = categories.get(item.categoryKey) ?? {
        name: sample.locale === ApiLocale.vi ? item.categoryNameVi : item.categoryNameEn,
        items: new Map<string, PackingPreviewItemDto>(),
      };
      const key = `${item.categoryKey}:${item.itemKey}`;
      const quantity = Math.min(
        99,
        item.quantityMode === QuantityMode.PER_DAY
          ? item.baseQuantity * sample.durationDays
          : item.baseQuantity,
      );
      const reason = sample.locale === ApiLocale.vi ? rule.reasonVi : rule.reasonEn;
      const existing = category.items.get(key);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, quantity);
        if (!existing.reason.split(' • ').includes(reason)) {
          existing.reason += ` • ${reason}`;
        }
        existing.matchedRules.push({ ruleId: rule.id, version: rule.version });
      } else {
        category.items.set(key, {
          clientKey: key,
          name: sample.locale === ApiLocale.vi ? item.itemNameVi : item.itemNameEn,
          quantity,
          note: sample.locale === ApiLocale.vi ? item.noteVi : item.noteEn,
          reason,
          matchedRules: [{ ruleId: rule.id, version: rule.version }],
        });
      }
      categories.set(item.categoryKey, category);
    }
  }
  return {
    source: 'RULE_BASED',
    sourceLabel:
      sample.locale === ApiLocale.vi
        ? weatherStatus === WeatherStatus.UNAVAILABLE
          ? 'Gợi ý theo quy tắc; thời tiết không bắt buộc'
          : 'Gợi ý theo quy tắc và dự báo Open‑Meteo'
        : weatherStatus === WeatherStatus.UNAVAILABLE
          ? 'Rule-based suggestions; weather is optional'
          : 'Rule-based suggestions with Open‑Meteo forecast',
    generatedAt: new Date().toISOString(),
    weatherStatus,
    categories: [...categories.entries()].map(([clientKey, category]) => ({
      clientKey,
      name: category.name,
      items: [...category.items.values()],
    })),
  };
}

function matches(rule: EngineRule, sample: RuleSampleDto): boolean {
  if (rule.tripType && rule.tripType !== sample.tripType) return false;
  if (rule.minDays !== null && sample.durationDays < rule.minDays) return false;
  if (rule.maxDays !== null && sample.durationDays > rule.maxDays) return false;
  if (rule.activityKey && !sample.activities.includes(rule.activityKey)) return false;
  const minTemp = toNumber(rule.minTempC);
  const maxTemp = toNumber(rule.maxTempC);
  if (minTemp !== null && (sample.highTemperatureCelsius === undefined || sample.highTemperatureCelsius < minTemp)) return false;
  if (maxTemp !== null && (sample.lowTemperatureCelsius === undefined || sample.lowTemperatureCelsius > maxTemp)) return false;
  if (rule.minRainPercent !== null && (sample.rainChancePercent === undefined || sample.rainChancePercent < rule.minRainPercent)) return false;
  return true;
}

function toNumber(value: { toNumber(): number } | number | null): number | null {
  return value === null ? null : typeof value === 'number' ? value : value.toNumber();
}
