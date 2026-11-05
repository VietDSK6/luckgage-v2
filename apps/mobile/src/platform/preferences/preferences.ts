import Storage from 'expo-sqlite/kv-store';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLanguage = 'vi' | 'en';
export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type AppPreferences = {
  themeMode: ThemeMode;
  language: AppLanguage;
  temperatureUnit: TemperatureUnit;
};

export const defaultPreferences: AppPreferences = {
  themeMode: 'system',
  language: 'vi',
  temperatureUnit: 'celsius',
};

const storageKeys = {
  themeMode: 'preferences.themeMode.v1',
  language: 'preferences.language.v1',
  temperatureUnit: 'preferences.temperatureUnit.v1',
} as const;

export function parseThemeMode(value: string | null): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : defaultPreferences.themeMode;
}

export function parseLanguage(value: string | null): AppLanguage {
  return value === 'vi' || value === 'en' ? value : defaultPreferences.language;
}

export function parseTemperatureUnit(value: string | null): TemperatureUnit {
  return value === 'celsius' || value === 'fahrenheit'
    ? value
    : defaultPreferences.temperatureUnit;
}

export async function loadPreferences(): Promise<AppPreferences> {
  const [themeMode, language, temperatureUnit] = await Promise.all([
    Storage.getItem(storageKeys.themeMode),
    Storage.getItem(storageKeys.language),
    Storage.getItem(storageKeys.temperatureUnit),
  ]);

  return {
    themeMode: parseThemeMode(themeMode),
    language: parseLanguage(language),
    temperatureUnit: parseTemperatureUnit(temperatureUnit),
  };
}

export async function saveThemeMode(themeMode: ThemeMode): Promise<void> {
  await Storage.setItem(storageKeys.themeMode, themeMode);
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await Storage.setItem(storageKeys.language, language);
}

export async function saveTemperatureUnit(temperatureUnit: TemperatureUnit): Promise<void> {
  await Storage.setItem(storageKeys.temperatureUnit, temperatureUnit);
}
