import type { AppLanguage } from '@/platform/preferences/preferences';

export const packingActivities = [
  'swimming',
  'hiking',
  'camping',
  'photography',
  'workout',
  'formal',
] as const;

export type PackingActivity = (typeof packingActivities)[number];

export type PackingSuggestionItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  quantity: number;
  note: string | null;
  reason: string;
  selected: boolean;
};

export type PackingPreview = {
  items: PackingSuggestionItem[];
  sourceLabel: string;
  weatherUsed: boolean;
};

const activityLabels: Record<PackingActivity, { vi: string; en: string }> = {
  swimming: { vi: 'Bơi lội', en: 'Swimming' },
  hiking: { vi: 'Đi bộ đường dài', en: 'Hiking' },
  camping: { vi: 'Cắm trại', en: 'Camping' },
  photography: { vi: 'Chụp ảnh', en: 'Photography' },
  workout: { vi: 'Tập luyện', en: 'Workout' },
  formal: { vi: 'Sự kiện trang trọng', en: 'Formal event' },
};

export function packingActivityLabel(activity: PackingActivity, language: AppLanguage): string {
  return activityLabels[activity][language];
}
