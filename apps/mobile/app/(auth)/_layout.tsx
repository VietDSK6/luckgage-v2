import { Redirect, Stack } from 'expo-router';

import { AppLoadingScreen } from '@/design/components/AppLoadingScreen';
import { AuthRecoveryScreen } from '@/features/auth/AuthRecoveryScreen';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === 'initializing') return <AppLoadingScreen />;
  if (status === 'restoreError') return <AuthRecoveryScreen />;
  if (status === 'authenticated') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
