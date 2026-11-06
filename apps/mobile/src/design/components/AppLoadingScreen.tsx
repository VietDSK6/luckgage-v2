import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themes } from '@/design/tokens';

import { BrandLuki } from './BrandLuki';

export function AppLoadingScreen() {
  const systemColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = themes[systemColorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <BrandLuki width={112} />
        <ActivityIndicator color={theme.colors.primary} size="small" />
        <Text style={[styles.text, { color: theme.colors.inkMuted }]}>Đang chuẩn bị luckgage…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
