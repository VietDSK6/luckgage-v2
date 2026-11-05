import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeLocalDatabase, DATABASE_NAME } from '@/data/local/database';
import { TripRepositoryProvider } from '@/data/repositories/TripRepositoryProvider';
import { AppLoadingScreen } from '@/design/components/AppLoadingScreen';
import { AppThemeProvider } from '@/design/theme/AppThemeProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppErrorBoundary } from '@/platform/errors/AppErrorBoundary';
import { PreferencesProvider } from '@/platform/preferences/PreferencesProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <Suspense fallback={<AppLoadingScreen />}>
          <SQLiteProvider
            databaseName={DATABASE_NAME}
            onInit={initializeLocalDatabase}
            useSuspense>
            <TripRepositoryProvider>
              <PreferencesProvider>
                <I18nProvider>
                  <AppThemeProvider>{children}</AppThemeProvider>
                </I18nProvider>
              </PreferencesProvider>
            </TripRepositoryProvider>
          </SQLiteProvider>
        </Suspense>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
