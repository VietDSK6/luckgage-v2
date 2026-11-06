import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';

import { AppIcon, type AppIconName } from './AppIcon';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: AppIconName;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function AppButton({
  accessibilityHint,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  style,
  variant = 'primary',
}: AppButtonProps) {
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;
  const colors = {
    primary: { background: theme.colors.primary, border: theme.colors.primary, text: theme.colors.background },
    secondary: { background: theme.colors.primarySoft, border: theme.colors.primary, text: theme.colors.primary },
    ghost: { background: theme.colors.background, border: theme.colors.outline, text: theme.colors.ink },
    danger: { background: theme.colors.background, border: theme.colors.danger, text: theme.colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background, borderColor: colors.border },
        isDisabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}>
      {loading ? <ActivityIndicator color={colors.text} size="small" /> : null}
      {!loading && icon ? <AppIcon color={colors.text} name={icon} size={19} /> : null}
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
