import { getTripDurationDays, type Trip } from '@/features/trips/domain/trip';
import type { WeatherForecast } from '@/features/weather/domain/weather';
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

export type PackingSuggestionInput = {
  trip: Trip;
  activities: PackingActivity[];
  extraNotes: string;
  weather: WeatherForecast | null;
  language: AppLanguage;
};

export function generatePackingPreview(input: PackingSuggestionInput): PackingPreview {
  const { language, trip, weather } = input;
  const duration = Math.min(7, Math.max(1, getTripDurationDays(trip)));
  const items: PackingSuggestionItem[] = [];
  const pick = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const categoryNames = {
    documents: pick('Giấy tờ', 'Documents'),
    clothing: pick('Quần áo', 'Clothing'),
    toiletries: pick('Đồ vệ sinh cá nhân', 'Toiletries'),
    electronics: pick('Thiết bị điện tử', 'Electronics'),
    activities: pick('Hoạt động', 'Activities'),
    weather: pick('Theo thời tiết', 'Weather ready'),
  };
  const add = (
    categoryId: keyof typeof categoryNames,
    itemId: string,
    name: string,
    reason: string,
    quantity = 1,
    note: string | null = null,
  ) => {
    const id = `${categoryId}:${itemId}`;
    if (items.some((item) => item.id === id)) return;
    items.push({
      id,
      categoryId,
      categoryName: categoryNames[categoryId],
      name,
      quantity,
      note,
      reason,
      selected: true,
    });
  };

  add(
    'documents',
    trip.tripType === 'international' ? 'passport' : 'photo-id',
    trip.tripType === 'international' ? pick('Hộ chiếu', 'Passport') : pick('Giấy tờ tùy thân', 'Photo ID'),
    trip.tripType === 'international'
      ? pick('Chuyến đi quốc tế', 'International trip')
      : pick('Giấy tờ thiết yếu', 'Travel essential'),
  );
  add(
    'documents',
    'reservations',
    pick('Vé và thông tin đặt chỗ', 'Tickets and reservations'),
    pick('Dùng khi nhận phòng hoặc lên phương tiện', 'Useful for check-in and transport'),
  );
  add(
    'clothing',
    'tops',
    pick('Áo mặc hằng ngày', 'Everyday tops'),
    pick(`Chuyến ${duration} ngày`, `${duration}-day trip`),
    duration,
  );
  add(
    'clothing',
    'underwear',
    pick('Đồ lót', 'Underwear'),
    pick(`Chuyến ${duration} ngày`, `${duration}-day trip`),
    duration,
  );
  add(
    'clothing',
    'shoes',
    pick('Giày thoải mái', 'Comfortable shoes'),
    pick('Di chuyển trong chuyến đi', 'Walking during the trip'),
  );
  if (trip.tripType === 'beach') {
    add('clothing', 'swimwear', pick('Đồ bơi', 'Swimwear'), pick('Chuyến đi biển', 'Beach trip'), 2);
  }
  if (trip.tripType === 'hiking' || trip.tripType === 'camping') {
    add(
      'clothing',
      'weatherproof-jacket',
      pick('Áo khoác chống thời tiết', 'Weatherproof jacket'),
      pick('Hoạt động ngoài trời', 'Outdoor trip'),
    );
  }
  add(
    'toiletries',
    'toothbrush',
    pick('Bàn chải và kem đánh răng', 'Toothbrush and toothpaste'),
    pick('Sinh hoạt hằng ngày', 'Daily routine'),
  );
  add('toiletries', 'sunscreen', pick('Kem chống nắng', 'Sunscreen'), pick('Bảo vệ da khi di chuyển', 'Sun protection'));
  add('toiletries', 'medication', pick('Thuốc cá nhân', 'Personal medication'), pick('Nhu cầu cá nhân', 'Personal essential'));
  add('electronics', 'phone-charger', pick('Sạc điện thoại', 'Phone charger'), pick('Thiết bị thiết yếu', 'Device essential'));
  add('electronics', 'power-bank', pick('Sạc dự phòng', 'Power bank'), pick('Dùng khi di chuyển', 'Useful in transit'));

  for (const activity of input.activities) {
    const activityRule = activitySuggestion(activity, language);
    add('activities', activity, activityRule.name, activityRule.reason, activityRule.quantity);
  }

  const combinedNotes = `${trip.note ?? ''} ${input.extraNotes}`.toLocaleLowerCase();
  if (combinedNotes.includes('mưa') || combinedNotes.includes('rain')) {
    add('weather', 'umbrella', pick('Ô gấp', 'Compact umbrella'), pick('Ghi chú có nhắc đến mưa', 'Rain mentioned in notes'));
  }

  if (weather) {
    if (weather.rainChancePercent >= 40) {
      const rainReason = pick(`Khả năng mưa ${weather.rainChancePercent}%`, `${weather.rainChancePercent}% chance of rain`);
      add('weather', 'umbrella', pick('Ô gấp', 'Compact umbrella'), rainReason);
      add('weather', 'rain-jacket', pick('Áo mưa nhẹ', 'Lightweight rain jacket'), rainReason);
    }
    if (weather.lowTemperatureCelsius <= 15) {
      add(
        'weather',
        'warm-layer',
        pick('Áo giữ ấm', 'Warm layer'),
        pick(`Nhiệt độ thấp ${Math.round(weather.lowTemperatureCelsius)}°C`, `Low of ${Math.round(weather.lowTemperatureCelsius)}°C`),
      );
    }
    if (weather.highTemperatureCelsius >= 30) {
      const heatReason = pick(`Nhiệt độ cao ${Math.round(weather.highTemperatureCelsius)}°C`, `High of ${Math.round(weather.highTemperatureCelsius)}°C`);
      add('weather', 'sun-hat', pick('Mũ chống nắng', 'Sun hat'), heatReason);
      add('weather', 'water-bottle', pick('Bình nước cá nhân', 'Reusable water bottle'), heatReason);
    }
  }

  return {
    items,
    weatherUsed: Boolean(weather),
    sourceLabel: weather
      ? pick('Gợi ý theo quy tắc và dự báo Open‑Meteo', 'Rule-based suggestions with Open‑Meteo forecast')
      : pick('Gợi ý theo quy tắc; không cần thời tiết để tiếp tục', 'Rule-based suggestions; weather is not required'),
  };
}

export function packingActivityLabel(activity: PackingActivity, language: AppLanguage): string {
  return activitySuggestion(activity, language).label;
}

function activitySuggestion(activity: PackingActivity, language: AppLanguage) {
  const values = {
    swimming: { vi: ['Bơi lội', 'Kính bơi', 'Hoạt động bơi lội'], en: ['Swimming', 'Swim goggles', 'Swimming activity'] },
    hiking: { vi: ['Đi bộ đường dài', 'Đèn đội đầu', 'Hoạt động hiking'], en: ['Hiking', 'Headlamp', 'Hiking activity'] },
    camping: { vi: ['Cắm trại', 'Túi ngủ', 'Hoạt động cắm trại'], en: ['Camping', 'Sleeping bag', 'Camping activity'] },
    photography: { vi: ['Chụp ảnh', 'Pin máy ảnh dự phòng', 'Hoạt động chụp ảnh'], en: ['Photography', 'Spare camera battery', 'Photography activity'] },
    workout: { vi: ['Tập luyện', 'Đồ tập', 'Kế hoạch tập luyện'], en: ['Workout', 'Workout clothes', 'Workout plan'] },
    formal: { vi: ['Sự kiện trang trọng', 'Trang phục lịch sự', 'Sự kiện trang trọng'], en: ['Formal event', 'Formal outfit', 'Formal event'] },
  }[activity];
  const [label, name, reason] = language === 'vi' ? values.vi : values.en;
  return { label, name, reason, quantity: 1 };
}
