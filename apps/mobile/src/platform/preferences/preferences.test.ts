import Storage from 'expo-sqlite/kv-store';

import {
  loadPreferences,
  parseLanguage,
  parseTemperatureUnit,
  parseThemeMode,
  saveLanguage,
  saveTemperatureUnit,
  saveThemeMode,
} from './preferences';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('preference parsing', () => {
  test('keeps supported values', () => {
    expect(parseThemeMode('dark')).toBe('dark');
    expect(parseLanguage('en')).toBe('en');
    expect(parseTemperatureUnit('fahrenheit')).toBe('fahrenheit');
  });

  test('falls back safely for unknown persisted values', () => {
    expect(parseThemeMode('sepia')).toBe('system');
    expect(parseLanguage('fr')).toBe('vi');
    expect(parseTemperatureUnit('kelvin')).toBe('celsius');
  });

  test('loads persisted theme and language values', async () => {
    jest
      .mocked(Storage.getItem)
      .mockResolvedValueOnce('dark')
      .mockResolvedValueOnce('en')
      .mockResolvedValueOnce('fahrenheit');

    await expect(loadPreferences()).resolves.toEqual({
      themeMode: 'dark',
      language: 'en',
      temperatureUnit: 'fahrenheit',
    });
  });

  test('persists theme and language under versioned keys', async () => {
    await saveThemeMode('light');
    await saveLanguage('en');
    await saveTemperatureUnit('fahrenheit');

    expect(Storage.setItem).toHaveBeenNthCalledWith(1, 'preferences.themeMode.v1', 'light');
    expect(Storage.setItem).toHaveBeenNthCalledWith(2, 'preferences.language.v1', 'en');
    expect(Storage.setItem).toHaveBeenNthCalledWith(
      3,
      'preferences.temperatureUnit.v1',
      'fahrenheit',
    );
  });
});
