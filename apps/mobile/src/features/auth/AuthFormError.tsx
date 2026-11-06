import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';

type AuthFormErrorProps = {
  message: string | null;
};

export function AuthFormError({ message }: AuthFormErrorProps) {
  const { theme } = useAppTheme();
  if (!message) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.danger },
      ]}>
      <Text style={[styles.message, { color: theme.colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  message: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
});
