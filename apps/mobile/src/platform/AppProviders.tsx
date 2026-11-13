import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiClientProvider } from '@/data/remote/ApiClientProvider';
import { ChecklistRepositoryProvider } from '@/data/repositories/ChecklistRepositoryProvider';
import { GuidesRepositoryProvider } from '@/data/repositories/GuidesRepositoryProvider';
import { MembershipRepositoryProvider } from '@/data/repositories/MembershipRepositoryProvider';
import { PackingSuggestionsRepositoryProvider } from '@/data/repositories/PackingSuggestionsRepositoryProvider';
import { ReminderRepositoryProvider } from '@/data/repositories/ReminderRepositoryProvider';
import { TripRepositoryProvider } from '@/data/repositories/TripRepositoryProvider';
import { TripSuggestionsRepositoryProvider } from '@/data/repositories/TripSuggestionsRepositoryProvider';
import { WeatherRepositoryProvider } from '@/data/repositories/WeatherRepositoryProvider';
import { AppFeedbackProvider } from '@/design/feedback/AppFeedbackProvider';
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
              <AppFeedbackProvider>
                <ApiClientProvider>
                  <AuthProvider>
                    <TripRepositoryProvider>
                      <TripSuggestionsRepositoryProvider>
                        <GuidesRepositoryProvider>
                          <MembershipRepositoryProvider>
                            <ChecklistRepositoryProvider>
                              <PackingSuggestionsRepositoryProvider>
                                <WeatherRepositoryProvider>
                                  <ReminderRepositoryProvider>{children}</ReminderRepositoryProvider>
                                </WeatherRepositoryProvider>
                              </PackingSuggestionsRepositoryProvider>
                            </ChecklistRepositoryProvider>
                          </MembershipRepositoryProvider>
                        </GuidesRepositoryProvider>
                      </TripSuggestionsRepositoryProvider>
                    </TripRepositoryProvider>
                  </AuthProvider>
                </ApiClientProvider>
              </AppFeedbackProvider>
            </AppThemeProvider>
          </I18nProvider>
        </PreferencesProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
