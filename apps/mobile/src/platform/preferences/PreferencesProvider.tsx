import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { logError } from '@/platform/logging/logger';

import {
  type AppLanguage,
  defaultPreferences,
  loadPreferences,
  saveLanguage,
  saveThemeMode,
  type ThemeMode,
} from './preferences';

type PreferencesContextValue = {
  themeMode: ThemeMode;
  language: AppLanguage;
  isReady: boolean;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultPreferences.themeMode);
  const [language, setLanguageState] = useState<AppLanguage>(defaultPreferences.language);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    loadPreferences()
      .then((preferences) => {
        if (!isActive) {
          return;
        }

        setThemeModeState(preferences.themeMode);
        setLanguageState(preferences.language);
      })
      .catch((error: unknown) => {
        logError('preferences.load', error);
      })
      .finally(() => {
        if (isActive) {
          setIsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setThemeMode = useCallback(
    async (nextThemeMode: ThemeMode) => {
      const previousThemeMode = themeMode;
      setThemeModeState(nextThemeMode);

      try {
        await saveThemeMode(nextThemeMode);
      } catch (error) {
        setThemeModeState(previousThemeMode);
        logError('preferences.themeMode.save', error);
      }
    },
    [themeMode],
  );

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage) => {
      const previousLanguage = language;
      setLanguageState(nextLanguage);

      try {
        await saveLanguage(nextLanguage);
      } catch (error) {
        setLanguageState(previousLanguage);
        logError('preferences.language.save', error);
      }
    },
    [language],
  );

  const value = useMemo(
    () => ({
      themeMode,
      language,
      isReady,
      setThemeMode,
      setLanguage,
    }),
    [isReady, language, setLanguage, setThemeMode, themeMode],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }

  return context;
}
