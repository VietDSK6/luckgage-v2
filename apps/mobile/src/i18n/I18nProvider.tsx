import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { usePreferences } from '@/platform/preferences/PreferencesProvider';
import type { AppLanguage } from '@/platform/preferences/preferences';

import { type MessageKey, translate } from './messages';

type I18nContextValue = {
  language: AppLanguage;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const { language } = usePreferences();
  const value = useMemo(
    () => ({
      language,
      t: (key: MessageKey) => translate(language, key),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}
