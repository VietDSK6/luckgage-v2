import type { ContentStatus, PackingRule, TripType } from '@/api/types';

const tripTypeLabels: Record<TripType, string> = {
  LEISURE: 'Nghỉ dưỡng',
  BUSINESS: 'Công tác',
  CAMPING: 'Cắm trại',
  BEACH: 'Biển',
  HIKING: 'Leo núi',
  CITY_TRIP: 'Thành phố',
  ROAD_TRIP: 'Đường bộ',
  INTERNATIONAL: 'Quốc tế',
  OTHER: 'Khác',
};

export const tripTypeOptions = Object.entries(tripTypeLabels) as Array<[TripType, string]>;

export function tripTypeLabel(value: TripType | null): string {
  return value ? tripTypeLabels[value] : 'Mọi loại chuyến đi';
}

export function contentStatusLabel(status: ContentStatus): string {
  return { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }[status];
}

export function packingRuleConditionSummary(rule: PackingRule): string {
  const parts = [tripTypeLabel(rule.conditions.tripType)];
  if (rule.conditions.minDays !== null || rule.conditions.maxDays !== null) {
    parts.push(`${rule.conditions.minDays ?? '—'}–${rule.conditions.maxDays ?? '—'} ngày`);
  }
  if (rule.conditions.minTempC !== null || rule.conditions.maxTempC !== null) {
    parts.push(`${rule.conditions.minTempC ?? '—'}–${rule.conditions.maxTempC ?? '—'}°C`);
  }
  if (rule.conditions.minRainPercent !== null) parts.push(`Mưa ≥ ${rule.conditions.minRainPercent}%`);
  if (rule.conditions.activityKey) parts.push(`Hoạt động: ${rule.conditions.activityKey}`);
  return parts.join(' · ');
}

export function formatRuleDate(value: string | null): string {
  if (!value) return 'Chưa xuất bản';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
