import { resolveColorScheme } from './AppThemeProvider';

describe('resolveColorScheme', () => {
  test('uses an explicit app preference', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });

  test('follows the system and falls back to light', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', null)).toBe('light');
  });
});
