import { Redirect, Stack } from 'expo-router';

import { AppLoadingScreen } from '@/design/components/AppLoadingScreen';
import { AuthRecoveryScreen } from '@/features/auth/AuthRecoveryScreen';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AuthenticatedLayout() {
  const { status } = useAuth();

  if (status === 'initializing') return <AppLoadingScreen />;
  if (status === 'restoreError') return <AuthRecoveryScreen />;
  if (status === 'unauthenticated') return <Redirect href="/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
    </Stack>
  );
}
