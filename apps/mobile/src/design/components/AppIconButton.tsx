import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';

import { AppIcon, type AppIconName } from './AppIcon';

type AppIconButtonProps = {
  accessibilityLabel: string;
  icon: AppIconName;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger';
  variant?: 'plain' | 'outlined' | 'soft';
  style?: ViewStyle;
};

export function AppIconButton({
  accessibilityLabel,
  icon,
  onPress,
  style,
  tone = 'default',
  variant = 'plain',
}: AppIconButtonProps) {
  const { theme } = useAppTheme();
  const iconColor = tone === 'primary' ? theme.colors.primary : tone === 'danger' ? theme.colors.danger : theme.colors.ink;
  const backgroundColor = variant === 'soft' ? theme.colors.primarySoft : 'transparent';
  const borderColor = variant === 'outlined' ? theme.colors.outlineStrong : 'transparent';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, borderRadius: theme.radius.pill },
        pressed ? styles.pressed : null,
        style,
      ]}>
      <AppIcon color={iconColor} name={icon} size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
});
