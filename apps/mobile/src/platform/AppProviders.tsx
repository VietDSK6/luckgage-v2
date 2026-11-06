import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiClientProvider } from '@/data/remote/ApiClientProvider';
import { ChecklistRepositoryProvider } from '@/data/repositories/ChecklistRepositoryProvider';
import { MembershipRepositoryProvider } from '@/data/repositories/MembershipRepositoryProvider';
import { PackingSuggestionsRepositoryProvider } from '@/data/repositories/PackingSuggestionsRepositoryProvider';
import { ReminderRepositoryProvider } from '@/data/repositories/ReminderRepositoryProvider';
import { TripRepositoryProvider } from '@/data/repositories/TripRepositoryProvider';
import { WeatherRepositoryProvider } from '@/data/repositories/WeatherRepositoryProvider';
import { AppThemeProvider } from '@/design/theme/AppThemeProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppErrorBoundary } from '@/platform/errors/AppErrorBoundary';
import { PreferencesProvider } from '@/platform/preferences/PreferencesProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <PreferencesProvider>
          <I18nProvider>
            <AppThemeProvider>
              <ApiClientProvider>
                <AuthProvider>
                  <TripRepositoryProvider>
                    <MembershipRepositoryProvider>
                      <ChecklistRepositoryProvider>
                        <PackingSuggestionsRepositoryProvider>
                          <WeatherRepositoryProvider>
                            <ReminderRepositoryProvider>{children}</ReminderRepositoryProvider>
                          </WeatherRepositoryProvider>
                        </PackingSuggestionsRepositoryProvider>
                      </ChecklistRepositoryProvider>
                    </MembershipRepositoryProvider>
                  </TripRepositoryProvider>
                </AuthProvider>
              </ApiClientProvider>
            </AppThemeProvider>
          </I18nProvider>
        </PreferencesProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
