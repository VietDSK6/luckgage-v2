import type { CalendarDate } from '@/features/trips/domain/calendarDate';
import type { AppLanguage, TemperatureUnit } from '@/platform/preferences/preferences';

export type WeatherDay = {
  date: CalendarDate;
  weatherCode: number;
  lowTemperatureCelsius: number;
  highTemperatureCelsius: number;
  rainChancePercent: number;
};

export type WeatherForecast = {
  tripId: string;
  destination: string;
  latitude: number;
  longitude: number;
  timezone: string;
  lowTemperatureCelsius: number;
  highTemperatureCelsius: number;
  rainChancePercent: number;
  weatherCode: number;
  days: WeatherDay[];
  fetchedAt: number;
  source: 'fresh' | 'cached';
  isStale: boolean;
};

export function celsiusToFahrenheit(value: number): number {
  return (value * 9) / 5 + 32;
}

export function formatTemperature(valueCelsius: number, unit: TemperatureUnit): string {
  const value = unit === 'fahrenheit' ? celsiusToFahrenheit(valueCelsius) : valueCelsius;
  return `${Math.round(value)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
}

export function weatherConditionLabel(code: number, language: AppLanguage): string {
  const condition = whenWeatherCode(code);
  return language === 'vi' ? condition.vi : condition.en;
}

function whenWeatherCode(code: number): { vi: string; en: string } {
  if (code === 0) return { vi: 'Trời quang', en: 'Clear sky' };
  if (code === 1) return { vi: 'Ít mây', en: 'Mainly clear' };
  if (code === 2) return { vi: 'Mây rải rác', en: 'Partly cloudy' };
  if (code === 3) return { vi: 'Nhiều mây', en: 'Overcast' };
  if (code === 45 || code === 48) return { vi: 'Có sương mù', en: 'Fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { vi: 'Mưa phùn', en: 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { vi: 'Có mưa', en: 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { vi: 'Có tuyết', en: 'Snow' };
  if ([95, 96, 99].includes(code)) return { vi: 'Có giông', en: 'Thunderstorm' };
  return { vi: 'Thời tiết thay đổi', en: 'Variable conditions' };
}
