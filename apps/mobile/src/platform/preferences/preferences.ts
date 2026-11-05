import Storage from 'expo-sqlite/kv-store';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLanguage = 'vi' | 'en';

export type AppPreferences = {
  themeMode: ThemeMode;
  language: AppLanguage;
};

export const defaultPreferences: AppPreferences = {
  themeMode: 'system',
  language: 'vi',
};

const storageKeys = {
  themeMode: 'preferences.themeMode.v1',
  language: 'preferences.language.v1',
} as const;

export function parseThemeMode(value: string | null): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : defaultPreferences.themeMode;
}

export function parseLanguage(value: string | null): AppLanguage {
  return value === 'vi' || value === 'en' ? value : defaultPreferences.language;
}

export async function loadPreferences(): Promise<AppPreferences> {
  const [themeMode, language] = await Promise.all([
    Storage.getItem(storageKeys.themeMode),
    Storage.getItem(storageKeys.language),
  ]);

  return {
    themeMode: parseThemeMode(themeMode),
    language: parseLanguage(language),
  };
}

export async function saveThemeMode(themeMode: ThemeMode): Promise<void> {
  await Storage.setItem(storageKeys.themeMode, themeMode);
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await Storage.setItem(storageKeys.language, language);
}
