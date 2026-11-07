import { Text, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import type { AppTheme } from '@/design/tokens';

type AppTextVariant = keyof AppTheme['typography'];
type AppTextTone = 'ink' | 'muted' | 'primary' | 'danger' | 'success' | 'inverse';

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  tone?: AppTextTone;
};

export function AppText({ style, tone = 'ink', variant = 'body', ...props }: AppTextProps) {
  const { theme } = useAppTheme();
  const colors: Record<AppTextTone, string> = {
    ink: theme.colors.ink,
    muted: theme.colors.inkMuted,
    primary: theme.colors.primary,
    danger: theme.colors.danger,
    success: theme.colors.success,
    inverse: theme.colors.background,
  };

  return <Text {...props} style={[theme.typography[variant] as TextStyle, { color: colors[tone] }, style]} />;
}
