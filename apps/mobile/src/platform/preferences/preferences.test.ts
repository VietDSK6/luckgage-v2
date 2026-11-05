import Storage from 'expo-sqlite/kv-store';

import {
  loadPreferences,
  parseLanguage,
  parseThemeMode,
  saveLanguage,
  saveThemeMode,
} from './preferences';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('preference parsing', () => {
  test('keeps supported values', () => {
    expect(parseThemeMode('dark')).toBe('dark');
    expect(parseLanguage('en')).toBe('en');
  });

  test('falls back safely for unknown persisted values', () => {
    expect(parseThemeMode('sepia')).toBe('system');
    expect(parseLanguage('fr')).toBe('vi');
  });

  test('loads persisted theme and language values', async () => {
    jest
      .mocked(Storage.getItem)
      .mockResolvedValueOnce('dark')
      .mockResolvedValueOnce('en');

    await expect(loadPreferences()).resolves.toEqual({ themeMode: 'dark', language: 'en' });
  });

  test('persists theme and language under versioned keys', async () => {
    await saveThemeMode('light');
    await saveLanguage('en');

    expect(Storage.setItem).toHaveBeenNthCalledWith(1, 'preferences.themeMode.v1', 'light');
    expect(Storage.setItem).toHaveBeenNthCalledWith(2, 'preferences.language.v1', 'en');
  });
});
