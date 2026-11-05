import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AppLoadingScreen } from '@/design/components/AppLoadingScreen';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { AppProviders } from '@/platform/AppProviders';
import { logError } from '@/platform/logging/logger';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigation />
    </AppProviders>
  );
}

function RootNavigation() {
  const { colorScheme, theme } = useAppTheme();
  const { isReady } = usePreferences();

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    SystemUI.setBackgroundColorAsync(theme.colors.background).catch((error: unknown) => {
      logError('systemUi.background', error);
    });
  }, [theme.colors.background]);

  if (!isReady) {
    return <AppLoadingScreen />;
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      />
    </>
  );
}
