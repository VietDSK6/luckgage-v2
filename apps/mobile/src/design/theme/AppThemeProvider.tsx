import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { type ColorSchemeName, useColorScheme } from 'react-native';

import { type AppColorScheme, type AppTheme, themes } from '@/design/tokens';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';
import type { ThemeMode } from '@/platform/preferences/preferences';

type AppThemeContextValue = {
  colorScheme: AppColorScheme;
  theme: AppTheme;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function resolveColorScheme(
  themeMode: ThemeMode,
  systemColorScheme: ColorSchemeName | null,
): AppColorScheme {
  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = usePreferences();
  const colorScheme = resolveColorScheme(themeMode, systemColorScheme);
  const value = useMemo(
    () => ({
      colorScheme,
      theme: themes[colorScheme],
    }),
    [colorScheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
